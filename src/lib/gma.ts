/*
    Copyright 2025 cirroskais

    Permission is hereby granted, free of charge, to any person obtaining a copy of this
    software and associated documentation files (the “Software”), to deal in the Software 
    without restriction, including without limitation the rights to use, copy, modify, merge,
    publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
    to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
    BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
    DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { lzma } from "@napi-rs/lzma";

interface Addon {
    name: string;
    author: string;
    steamId: number;
    timestamp: Date;
    metadata: {
        description: string;
        type: string;
        tags: string[];
    };
    fileBlock: number;
    files: {
        path: string;
        size: number;
        crc: number;
        offset: number;
        fileNumber: number;
    }[];
}

function readNTString(buf: Buffer, start: number): [string, number] {
    let lookAhead: number = start;
    while (buf.toString("hex", lookAhead, lookAhead + 1) !== "00") lookAhead += 1;
    return [buf.toString("ascii", start, lookAhead), lookAhead + 1];
}

export async function parse(file: Buffer): Promise<Addon> {
    if (file.toString("hex", 0, 4) !== "474d4144") file = await lzma.decompress(file as any);
    if (file.toString("hex", 4, 5) !== "03") throw new Error("Unsupported version/invalid file");

    let cursor = 5;

    const steamId = Number(file.readBigUInt64LE(cursor));
    cursor += 8;

    const timestamp = new Date(Number(file.readBigUInt64LE(cursor)) * 1000);
    cursor += 8;

    cursor += 1;

    const [name, nameEnd] = readNTString(file, cursor);
    cursor = nameEnd;

    const [unparsedJson, jsonEnd] = readNTString(file, cursor);
    cursor = jsonEnd;

    const [author, authorEnd] = readNTString(file, cursor);
    cursor = authorEnd;

    let json;
    try {
        json = JSON.parse(unparsedJson);
    } catch (_) {
        json = unparsedJson;
    }

    cursor += 4;

    let files = [];
    let offset = 0;
    let fileNumber = 1;

    while (file.readInt32LE(cursor) != 0) {
        cursor += 4;

        const [path, pathEnd] = readNTString(file, cursor);
        cursor = pathEnd;

        const size = Number(file.readBigInt64LE(cursor));
        cursor += 8;

        const crc = file.readInt32LE(cursor);
        cursor += 4;

        files.push({
            path,
            size,
            crc,
            offset,
            fileNumber,
        });

        fileNumber += 1;
        offset += size;
    }

    cursor += 4;

    return {
        name,
        author,
        steamId,
        timestamp,
        metadata: json,
        fileBlock: cursor,
        files,
    };
}

export async function extract(options: { file: Buffer; addon?: Addon; fileName: string }): Promise<Buffer> {
    if (options.file.toString("hex", 0, 4) !== "474d4144") options.file = await lzma.decompress(options.file as any);
    if (options.file.toString("hex", 4, 5) !== "03") throw new Error("Unsupported version/invalid file");

    if (!options.file && !options.fileName) throw new Error("file or fileName not specified");
    if (!options.addon) options.addon = await parse(options.file);
    if (!options.addon) throw new Error("Unable to read file");

    const file = options.addon.files.find((_) => _.path === options.fileName);
    if (!file) throw new Error("Invalid fileName (File not found in addon)");

    let fileBlock = options.addon.fileBlock;
    let fileStart = fileBlock + file.offset;
    let fileEnd = fileStart + file.size;

    return options.file.subarray(fileStart, fileEnd);
}
