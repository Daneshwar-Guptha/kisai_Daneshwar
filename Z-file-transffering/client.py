import os
import grpc
from ./proto import fileTransfer_pb2, fileTransfer_pb2_grpc

DOWNLOAD_DIR = "/mnt/c/Users/kdaneshwar/Documents/random_files1"
SERVER_FOLDER = "/mnt/c/Users/kdaneshwar/Documents/random_files"

os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def collect_progress(base):
    progress_list = []
    for root, _, files in os.walk(base):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base)
            progress_list.append({file_path=rel_path, offset=os.path.getsize(full_path)}))
    return progress_list

def main():
    channel = grpc.insecure_channel("localhost:50051")
    client = fileTransfer_pb2_grpc.FileTransferServiceStub(channel)
    progress = collect_progress(DOWNLOAD_DIR)
    stream = client.DownloadFolder(fileTransfer_pb2.FolderRequest(folder_path=SERVER_FOLDER, progress=progress))

    open_files = {}
    chunk_counter = {}

    for chunk in stream:
        out_path = os.path.join(DOWNLOAD_DIR, chunk.file_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        if out_path not in open_files:
            f = open(out_path, "r+b") if os.path.exists(out_path) else open(out_path, "wb")
            open_files[out_path] = f
            chunk_counter[out_path] = 0
            print(f"[CLIENT] Started file: {chunk.file_path}")

        f = open_files[out_path]

        if chunk.data:
            f.seek(chunk.offset)
            f.write(chunk.data)
            chunk_counter[out_path] += 1
            print(f"[CLIENT] File={chunk.file_path} Chunk={chunk_counter[out_path]} Offset={chunk.offset}")

        if chunk.eof:
            f.close()
            del open_files[out_path]
            print(f"[CLIENT] Finished file: {chunk.file_path}")

if __name__ == "__main__":
    main()
