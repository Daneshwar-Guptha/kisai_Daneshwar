const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const readline = require("readline");
const path = require("path");

const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "proto/message.proto")
);

const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const messagePackage = grpcObject.UserMessage;

const server = new grpc.Server();

function getMessage(call) {
  console.log("Client connected");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });


  call.on("data", (request) => {
    console.log("Message from client:", request.message);
  });


  call.on("end", () => {
    console.log("Client disconnected");
    rl.close();
    call.end();
  });

  call.on("error", (err) => {
    console.error("Stream error:", err.message);
    rl.close();
  });

  function askMessage() {
    rl.question("Enter message to client: ", (message) => {
      if (message.toLowerCase() === "exit") {
        console.log("Closing connection");
        rl.close();
        call.end();
        return;
      }

      call.write({ message });
      askMessage();
    });
  }

  askMessage();
}

server.addService(
  messagePackage.MessageService.service,
  { getMessage }
);

server.bindAsync(
  "0.0.0.0:6000",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Server running on port", port);
   
  }
);