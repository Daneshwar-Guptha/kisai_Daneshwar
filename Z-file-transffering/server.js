const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto/file_transfer.proto");
const FILE_PATH = "C:/Users/K Daneshwar guptha/OneDrive/Desktop/JavaScript/Day2/practice.java"; 
const CHUNK_SIZE = 64 * 1024;

const packageDef = protoLoader.loadSync(PROTO_PATH,{
   keepCase: true,
   longs:String,
   defaults:true
});
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

function DownloadFile(call) {

  let offset = 0;
  if (call.request.offset !== undefined && call.request.offset !== null) {
    offset = parseInt(call.request.offset, 10);
  }
 

  if (!fs.existsSync(FILE_PATH)) {
    call.emit("error", {
      code: grpc.status.NOT_FOUND,
      message: "File not found",
    });
    return;
  }

  let chunkNumber = Math.floor(offset / CHUNK_SIZE);

  const stream = fs.createReadStream(FILE_PATH, {
    start: offset,
    highWaterMark: CHUNK_SIZE,
  });

  stream.on("data", (chunk) => {
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

const server = new grpc.Server();
server.addService(proto.FileTransferService.service, { DownloadFile });

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    
    console.log("Server running on port 50051");
  }
);
