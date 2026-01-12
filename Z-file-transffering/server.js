const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname,"./proto/file_transfer.proto")
const CHUNK_SIZE = 64 * 1024; // 64KB

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition)
  .filetransfer;

function DownloadFile(call) {
  const fileName = call.request.file_name;
  const offset = Number(call.request.offset);
  const filePath = "C:/Users/K Daneshwar guptha/OneDrive/Desktop/JavaScript/Day2/practice.java";

  if (!fs.existsSync(filePath)) {
    call.emit("error", {
      code: grpc.status.NOT_FOUND,
      message: "File not found",
    });
    return;
  }

  const fileSize = fs.statSync(filePath).size;
  let chunkNumber = Math.floor(offset / CHUNK_SIZE);

  const stream = fs.createReadStream(filePath, {
    start: offset,
    highWaterMark: CHUNK_SIZE,
  });

  stream.on("data", (chunk) => {
    console.log("client connected");
    call.write({
      data: chunk,
      chunk_number: chunkNumber++,
      eof: false,
    });
  });

  stream.on("end", () => {
    call.write({
      data: Buffer.alloc(0),
      chunk_number: chunkNumber,
      eof: true,
    });
    call.end();
  });

  stream.on("error", (err) => {
    call.emit("error", {
      code: grpc.status.INTERNAL,
      message: err.message,
    });
  });
}

function main() {
  const server = new grpc.Server();

  server.addService(proto.FileTransferService.service, {
    DownloadFile,
  });

  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log("Server running on port 50051");
     
    }
  );
}

main();
