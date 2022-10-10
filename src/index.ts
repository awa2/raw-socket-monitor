import { Protocol, RawSocket } from "./lib/raw-socket";

console.log('START');
const udp = RawSocket.createSocket({ protocol: Protocol.UDP });
const tcp = RawSocket.createSocket({ protocol: Protocol.TCP });
const icmp = RawSocket.createSocket({ protocol: Protocol.ICMP });

tcp.on('message', (buffer, address) => {
  const srcAddress = [
    buffer.slice(12, 13).readInt8(),
    buffer.slice(13, 14).readInt8(),
    buffer.slice(14, 15).readInt8(),
    buffer.slice(15, 16).readInt8()
  ];
  const dstAddress = [
    buffer.slice(16, 17).readInt8(),
    buffer.slice(17, 18).readInt8(),
    buffer.slice(18, 19).readInt8(),
    buffer.slice(19, 20).readInt8()
  ];
  const payload = buffer.slice(24, buffer.length);
  console.log(`TCP ${srcAddress.join('.')} => ${dstAddress.join('.')} | ${payload.length} bytes`);
});
udp.on('message', (buffer, address) => {
  const srcAddress = [
    buffer.slice(12, 13).readInt8(),
    buffer.slice(13, 14).readInt8(),
    buffer.slice(14, 15).readInt8(),
    buffer.slice(15, 16).readInt8()
  ];
  const dstAddress = [
    buffer.slice(16, 17).readInt8(),
    buffer.slice(17, 18).readInt8(),
    buffer.slice(18, 19).readInt8(),
    buffer.slice(19, 20).readInt8()
  ];
  const payload = buffer.slice(24, buffer.length);
  console.log(`UDP ${srcAddress.join('.')} => ${dstAddress.join('.')} | ${payload.length} bytes`);
});
icmp.on('message', (buffer: Buffer, address) => {
  const srcAddress = [
    buffer.slice(12, 13).readInt8(),
    buffer.slice(13, 14).readInt8(),
    buffer.slice(14, 15).readInt8(),
    buffer.slice(15, 16).readInt8()
  ];
  const dstAddress = [
    buffer.slice(16, 17).readInt8(),
    buffer.slice(17, 18).readInt8(),
    buffer.slice(18, 19).readInt8(),
    buffer.slice(19, 20).readInt8()
  ];
  const payload = buffer.slice(24, buffer.length);
  console.log(`ICMP ${srcAddress.join('.')} => ${dstAddress.join('.')} | ${payload.length} bytes`);
});
