const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/fileTransfer.proto");
const CHUNK_SIZE = 3 * 1024 * 1024;

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
});
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

const client = new proto.FileTransferService(
  "10.18.226.157:50051",
  grpc.credentials.createInsecure()
);

const DOWNLOAD_DIR = "/mnt/c/Users/kdaneshwar/Documents/random_file_1gb_file";
const SERVER_FOLDER = "";


fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });


function collectProgress(dir, base = dir, list = []) {
  if (!fs.existsSync(dir)) return list;

  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collectProgress(full, base, list);
    else list.push({ file_path: path.relative(base, full), offset: stat.size });
  }
  return list;
}

const progress = collectProgress(DOWNLOAD_DIR);
const openFiles = new Map();
const chunkCounter = new Map();

const call = client.DownloadFolder({
  folder_path: SERVER_FOLDER,
  progress,
});

call.on("data", chunk => {
  if (!chunk.file_path) return;

  const out = path.join(DOWNLOAD_DIR, chunk.file_path);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  let fd = openFiles.get(out);
  if (!fd) {
    fd = fs.existsSync(out)
      ? fs.openSync(out, "r+")
      : fs.openSync(out, "w");
    openFiles.set(out, fd);
    chunkCounter[out] = 0;
    console.log(`CLIENT Started file: ${chunk.file_path}`);
  }

  if (chunk.data.length > 0) {
    chunkCounter[out]++;
    fs.writeSync(fd, chunk.data, 0, chunk.data.length, chunk.offset);
    console.log(
      `CLIENT File=${chunk.file_path} Chunk=${chunkCounter[out]} Offset=${chunk.offset}`
    );
  }

  if (chunk.eof) {
    fs.closeSync(fd);
    openFiles.delete(out);
    console.log(`CLIENT Finished file: ${chunk.file_path}`);
  }
});

call.on("end", () => {
  console.log("CLIENT Download completed");
});

call.on("error", err => {
  console.error("CLIENT Download failed:", err.message);
});
