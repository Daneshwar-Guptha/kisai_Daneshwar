const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto/fileTransfer.proto");

const FILE_PATH = "C:/Users/kdaneshwar/Documents/random_files";

if(fs.existsSync(FILE_PATH)){
  console.log("folder was existed")
}
else{
  console.log("folder was not exusted");
}

const CHUNK_SIZE = 64 * 1024;

const packageDef = protoLoader.loadSync(PROTO_PATH);
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

function DownloadFolder(){

}


const server = new grpc.Server();
server.addService(proto.FileTransferService.service, { DownloadFolder });

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  () => {
    
    console.log("Server running on port 50051");
  }
);
