const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/fileTransfer.proto");
const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
});
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

function walkDir(dir, base = dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkDir(full, base, files);
    else files.push({ full, rel: path.relative(base, full), size: stat.size });
  }
  return files;
}

function DownloadFolder(call) {
  console.log("[SERVER] Client connected");

  let currentStream = null;

  call.on("error", (err) => {
    console.log("[SERVER] Client disconnected or error:", err.message);
    if (currentStream) currentStream.destroy();
  });

  call.on("cancelled", () => {
    console.log("[SERVER] Client cancelled the download");
    if (currentStream) currentStream.destroy();
  });

  const folderPath = call.request.folder_path;
  if (!folderPath || !fs.existsSync(folderPath)) {
    call.destroy(new Error("Folder not found"));
    return;
  }

  const progressMap = new Map();
  for (const p of call.request.progress) {
    progressMap.set(p.file_path, Number(p.offset));
  }

  const files = walkDir(folderPath);
  let index = 0;

  function sendNextFile() {
    if (index >= files.length) {
      console.log("[SERVER] All files sent");
      call.end();
      return;
    }

    const file = files[index++];
    let offset = progressMap.get(file.rel) || 0;
    if (offset >= file.size) {
      sendNextFile();
      return;
    }

    currentStream = fs.createReadStream(file.full, {
      start: offset,
      highWaterMark: CHUNK_SIZE,
    });

    let chunkNo = 0;

    currentStream.on("data", chunk => {
      chunkNo++;
      if (!call.writableEnded && !call.destroyed) {
        call.write({
          file_path: file.rel,
          offset,
          data: chunk,
          eof: false,
        });
        offset += chunk.length;
        console.log(`[SERVER] File=${file.rel} Chunk=${chunkNo} Bytes=${chunk.length} Offset=${offset}`);
      } else {
        console.log("[SERVER] Client disconnected, stopping stream");
        currentStream.destroy();
      }
    });

    currentStream.on("end", () => {
      if (!call.destroyed) {
        call.write({
          file_path: file.rel,
          offset,
          data: Buffer.alloc(0),
          eof: true,
        });
        console.log(`[SERVER] Finished file: ${file.rel}`);
        sendNextFile();
      }
    });

    currentStream.on("error", (err) => {
      console.log("[SERVER] Stream error:", err.message);
      sendNextFile();
    });
  }

  sendNextFile();
}

const server = new grpc.Server();
server.addService(proto.FileTransferService.service, { DownloadFolder });

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("[SERVER] Running on port 50051");
  }
);
