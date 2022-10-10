
import { EventEmitter } from 'events';
import net from 'net';
const raw = require("raw-socket/build/Release/raw.node");

export const AddressFamily = {
  IPv4: 1,
  IPv6: 2,
};
type AddressFamily = typeof AddressFamily[keyof typeof AddressFamily];
export const Protocol = {
  None: 0,
  ICMP: 1,
  TCP: 6,
  UDP: 17,
  ICMPv6: 58
};
type Protocol = typeof Protocol[keyof typeof Protocol];
export const SocketLevel = {
  SOL_SOCKET: 65535,
  IPPROTO_IP: 0,
  IPPROTO_IPV6: 41
}
type SocketLevel = typeof SocketLevel[keyof typeof SocketLevel];
export const SocketOption = {
  SO_BROADCAST: 32,
  SO_RCVBUF: 4098,
  SO_RCVTIMEO: 4102,
  SO_SNDBUF: 4097,
  SO_SNDTIMEO: 4101,
  IP_HDRINCL: 2,
  IP_OPTIONS: 1,
  IP_TOS: 3,
  IP_TTL: 4,
  IPV6_TTL: 4,
  IPV6_UNICAST_HOPS: 4,
  IPV6_V6ONLY: 27
}
type SocketOption = typeof SocketOption[keyof typeof SocketOption];
export type RawSocketOptions = {
  addressFamily?: AddressFamily,
  protocol?: Protocol,
  bufferSize?: number,
  generateChecksums?: boolean,
  checksumOffset?: number
}

for (const key in EventEmitter.prototype) {
  raw.SocketWrap.prototype[key] = EventEmitter.prototype[key];
}

export class RawSocket extends EventEmitter {
  static AddressFamily = AddressFamily;
  static Protocol = Protocol;
  static createChecksum(...bufferOrObject: (Buffer | {
    buffer: Buffer, offset: number, length: number
  })[]) {
    let sum = 0;
    bufferOrObject.forEach(object => {
      if (object instanceof Buffer) {
        sum = raw.createChecksum(sum, object, 0, object.length);
      } else {
        sum = raw.createChecksum(sum, object.buffer, object.offset, object.length);
      }
    })
    return sum;
  }
  static writeChecksum(buffer: Buffer, offset: number, checksum: number) {
    buffer.writeUInt8((checksum & 0xff00) >> 8, offset);
    buffer.writeUInt8(checksum & 0xff, offset + 1);
    return buffer;
  }
  /**
   * 新しいsocketを作成する。socket(AF_INET, SOCK_RAW, ${Protocol})が内部では呼ばれる。
   * ただし、macではICMPのみ動作し、SOCK_DGRAMに自動的にディグレードする。
   *
   * @static
   * @param {RawSocketOptions} [options]
   * @return {*}
   * @memberof RawSocket
   */
  static createSocket(options?: RawSocketOptions) {
    return new RawSocket(options || {});
  }
  static SocketLevel = raw.SocketLevel as SocketLevel;
  static SocketOption = raw.SocketOption as SocketOption;
  static htonl = raw.htonl;
  static htons = raw.htons;
  static ntohl = raw.ntohl;
  static ntohs = raw.ntohs;

  private wrap: any;
  private buffer: Buffer;
  private recvPaused: boolean = false;
  private sendPaused: boolean = true;
  private requests: {
    buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    callback?: (error: Error | null, bytes: number) => any,
  }[]

  private constructor(options: RawSocketOptions) {
    super()

    this.requests = [];
    this.buffer = Buffer.alloc(options && options.bufferSize ? options.bufferSize : 4096);
    this.wrap = new raw.SocketWrap(((options && options.protocol) ? options.protocol : Protocol.None), ((options && options.addressFamily) ? options.addressFamily : AddressFamily.IPv4));
    this.wrap.on("sendReady", this.onSendReady.bind(this));
    this.wrap.on("recvReady", this.onRecvReady.bind(this));
    this.wrap.on("error", this.onError.bind(this));
    this.wrap.on("close", this.onClose.bind(this));
  }

  /**
   * パケットを送信する
   *
   * @param {Buffer} buffer
   * @param {number} offset
   * @param {number} length
   * @param {string} address
   * @param {((error: Error | null, bytes?: number) => any)} [callback]
   * @memberof RawSocket
   */
  send(buffer: Buffer,
    offset: number,
    length: number,
    address: string,
    callback?: (error: Error | null, bytes?: number) => any
  ) {
    if (!callback) { callback = () => { } };

    if (length + offset > buffer.length) {
      callback(new Error(`Buffer length '${buffer.length}' is not large enough for the specified offset '${offset}' plus length '${length}'`))
      return this;
    }

    if (!net.isIP(address)) {
      callback(new Error(`Invalid IP address '${address}'`));
      return this;
    }
    const req = {
      buffer,
      offset,
      length,
      address,
      callback,
    };
    this.requests.push(req);

    if (this.sendPaused) {
      this.resumeSend();
    }

    return this;
  }
  close() {
    this.wrap.close();
    return this;
  }
  getOption(level, option, value, length) {
    return this.wrap.getOption(level, option, value, length);
  }
  onClose() {
    this.emit("close");
  }
  onError(error: Error) {
    this.emit("error", error);
    this.close();
  }
  onRecvReady() {
    try {
      this.wrap.recv(this.buffer, (buffer: Buffer, bytes: number, source: string) => {
        const newBuffer = buffer.slice(0, bytes);
        this.emit("message", newBuffer, source);
      });
    } catch (error) {
      this.emit("error", error);
    }
  }
  onSendReady() {
    if (this.requests.length > 0) {
      const req = this.requests.shift();
      if (req) {

        try {
          this.wrap.send(req.buffer, req.offset, req.length, req.address, (bytes: number) => {
            if (req.callback) {
              req.callback(null, bytes);
            }
          });
        } catch (error) {
          if (req.callback) {
            req.callback(error, 0);
          }
        }
      }
    } else {
      if (!this.sendPaused)
        this.pauseSend();
    }
  }
  pauseRecv() {
    this.recvPaused = true;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }
  pauseSend() {
    this.sendPaused = true;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }
  resumeRecv() {
    this.recvPaused = false;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }
  resumeSend() {
    this.sendPaused = false;
    this.wrap.pause(this.recvPaused, this.sendPaused);
    return this;
  }
  setOption(level: number, option, value, length?: number) {
    if (arguments.length > 3) {
      this.wrap.setOption(level, option, value, length);
    } else {
      this.wrap.setOption(level, option, value);
    }
  }
}
