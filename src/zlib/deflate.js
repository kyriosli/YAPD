// https://github.com/imaya/js
(function (obj, Uint8Array, Uint16Array, Uint32Array) {
    'use strict';
    var undefined = void 0;
    /**
     * カスタムハフマン符号で使用するヒープ実装
     *
     * @param {number}
     *            length ヒープサイズ.
     * @constructor
     */
    var Heap = function (length) {
        this.buffer = new Uint16Array(length * 2);
        this.length = 0;
    };

    /**
     * 親ノードの index 取得
     *
     * @param {number}
     *            index 子ノードの index.
     * @return {number} 親ノードの index.
     *
     */
    Heap.prototype.getParent = function (index) {
        return ((index - 2) / 4 | 0) * 2;
    };

    /**
     * 子ノードの index 取得
     *
     * @param {number}
     *            index 親ノードの index.
     * @return {number} 子ノードの index.
     */
    Heap.prototype.getChild = function (index) {
        return 2 * index + 2;
    };

    /**
     * Heap に値を追加する
     *
     * @param {number}
     *            index キー index.
     * @param {number}
     *            value 値.
     * @return {number} 現在のヒープ長.
     */
    Heap.prototype.push = function (index, value) {
        var current, parent, heap = this.buffer, swap;

        current = this.length;
        heap[this.length++] = value;
        heap[this.length++] = index;

        // ルートノードにたどり着くまで入れ替えを試みる
        while (current > 0) {
            parent = this.getParent(current);

            // 親ノードと比較して親の方が小さければ入れ替える
            if (heap[current] > heap[parent]) {
                swap = heap[current];
                heap[current] = heap[parent];
                heap[parent] = swap;

                swap = heap[current + 1];
                heap[current + 1] = heap[parent + 1];
                heap[parent + 1] = swap;

                current = parent;
                // 入れ替えが必要なくなったらそこで抜ける
            } else {
                break;
            }
        }

        return this.length;
    };

    /**
     * Heapから一番大きい値を返す
     *
     * @return {{index: number, value: number, length: number}} {index: キーindex,
	 *         value: 値, length: ヒープ長} の Object.
     */
    Heap.prototype.pop = function () {
        var index, value, heap = this.buffer, swap, current, parent;

        value = heap[0];
        index = heap[1];

        // 後ろから値を取る
        this.length -= 2;
        heap[0] = heap[this.length];
        heap[1] = heap[this.length + 1];

        parent = 0;
        // ルートノードから下がっていく
        while (true) {
            current = this.getChild(parent);

            // 範囲チェック
            if (current >= this.length) {
                break;
            }

            // 隣のノードと比較して、隣の方が値が大きければ隣を現在ノードとして選択
            if (current + 2 < this.length && heap[current + 2] > heap[current]) {
                current += 2;
            }

            // 親ノードと比較して親の方が小さい場合は入れ替える
            if (heap[current] > heap[parent]) {
                swap = heap[parent];
                heap[parent] = heap[current];
                heap[current] = swap;

                swap = heap[parent + 1];
                heap[parent + 1] = heap[current + 1];
                heap[current + 1] = swap;
            } else {
                break;
            }

            parent = current;
        }

        return {
            index: index,
            value: value,
            length: this.length
        };
    };

    // end of scope

    /**
     * ビットストリーム
     *
     * @constructor
     * @param {!(Array|Uint8Array)=}
     *            buffer output buffer.
     * @param {number=}
     *            bufferPosition start buffer pointer.
     */
    var BitStream = function (buffer, bufferPosition) {
        /** @type {number} buffer index. */
        this.index = typeof bufferPosition === 'number' ? bufferPosition : 0;
        /** @type {number} bit index. */
        this.bitindex = 0;
        /** @type {!(Array|Uint8Array)} bit-stream output buffer. */
        this.buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(BitStream.DefaultBlockSize);

        // 入力された index が足りなかったら拡張するが、倍にしてもダメなら不正とする
        if (this.buffer.length * 2 <= this.index) {
            throw new Error("invalid index");
        } else if (this.buffer.length <= this.index) {
            this.expandBuffer();
        }
    };

    /**
     * デフォルトブロックサイズ.
     *
     * @const
     * @type {number}
     */
    BitStream.DefaultBlockSize = 0x8000;

    /**
     * expand buffer.
     *
     * @return {!(Array|Uint8Array)} new buffer.
     */
    BitStream.prototype.expandBuffer = function () {
        /** @type {!(Array|Uint8Array)} old buffer. */
        var oldbuf = this.buffer;
        /** @type {number} loop counter. */
        var i;
        /** @type {number} loop limiter. */
        var il = oldbuf.length;
        /** @type {!(Array|Uint8Array)} new buffer. */
        var buffer = new Uint8Array(il << 1);

        // copy buffer
        buffer.set(oldbuf);

        return (this.buffer = buffer);
    };

    /**
     * 数値をビットで指定した数だけ書き込む.
     *
     * @param {number}
     *            number 書き込む数値.
     * @param {number}
     *            n 書き込むビット数.
     * @param {boolean=}
     *            reverse 逆順に書き込むならば true.
     */
    BitStream.prototype.writeBits = function (number, n, reverse) {
        var buffer = this.buffer;
        var index = this.index;
        var bitindex = this.bitindex;

        /** @type {number} current octet. */
        var current = buffer[index];
        /** @type {number} loop counter. */
        var i;

        /**
         * 32-bit 整数のビット順を逆にする
         *
         * @param {number}
         *            n 32-bit integer.
         * @return {number} reversed 32-bit integer.
         * @private
         */
        function rev32_(n) {
            return (BitStream.ReverseTable[n & 0xFF] << 24) | (BitStream.ReverseTable[n >>> 8 & 0xFF] << 16)
                | (BitStream.ReverseTable[n >>> 16 & 0xFF] << 8) | BitStream.ReverseTable[n >>> 24 & 0xFF];
        }

        if (reverse && n > 1) {
            number = n > 8 ? rev32_(number) >> (32 - n) : BitStream.ReverseTable[number] >> (8 - n);
        }

        // Byte 境界を超えないとき
        if (n + bitindex < 8) {
            current = (current << n) | number;
            bitindex += n;
            // Byte 境界を超えるとき
        } else {
            for (i = 0; i < n; ++i) {
                current = (current << 1) | ((number >> n - i - 1) & 1);

                // next byte
                if (++bitindex === 8) {
                    bitindex = 0;
                    buffer[index++] = BitStream.ReverseTable[current];
                    current = 0;

                    // expand
                    if (index === buffer.length) {
                        buffer = this.expandBuffer();
                    }
                }
            }
        }
        buffer[index] = current;

        this.buffer = buffer;
        this.bitindex = bitindex;
        this.index = index;
    };

    /**
     * ストリームの終端処理を行う
     *
     * @return {!(Array|Uint8Array)} 終端処理後のバッファを byte array で返す.
     */
    BitStream.prototype.finish = function () {
        var buffer = this.buffer;
        var index = this.index;

        /** @type {!(Array|Uint8Array)} output buffer. */
        var output;

        // bitindex が 0 の時は余分に index が進んでいる状態
        if (this.bitindex > 0) {
            buffer[index] <<= 8 - this.bitindex;
            buffer[index] = BitStream.ReverseTable[buffer[index]];
            index++;
        }

        // array truncation
        output = buffer.subarray(0, index);

        return output;
    };

    /**
     * 0-255 のビット順を反転したテーブル
     *
     * @const
     * @type {!(Uint8Array|Array.<number>)}
     */
    BitStream.ReverseTable = (function (table) {
        return table;
    })((function () {
        /** @type {!(Array|Uint8Array)} reverse table. */
        var table = new Uint8Array(256);
        /** @type {number} loop counter. */
        var i;
        /** @type {number} loop limiter. */
        var il;

        // generate
        for (i = 0; i < 256; ++i) {
            table[i] = (function (n) {
                var r = n;
                var s = 7;

                for (n >>>= 1; n; n >>>= 1) {
                    r <<= 1;
                    r |= n & 1;
                    --s;
                }

                return (r << s & 0xff) >>> 0;
            })(i);
        }

        return table;
    })());

    /**
     * Raw Deflate 実装
     *
     * @constructor
     * @param {!(Array.
	 *            <number>|Uint8Array)} input 符号化する対象のバッファ.
     * @param {Object=}
     *            opt_params option parameters.
     *
     * typed array が使用可能なとき、outputBuffer が Array は自動的に Uint8Array に 変換されます.
     * 別のオブジェクトになるため出力バッファを参照している変数などは 更新する必要があります.
     */
    var RawDeflate = function (input, opt_params) {
        /** @type {Deflate_CompressionType} */
        this.compressionType = Deflate_CompressionType.DYNAMIC;
        /** @type {number} */
        this.lazy = 0;
        /** @type {!(Array.<number>|Uint32Array)} */
        this.freqsLitLen;
        /** @type {!(Array.<number>|Uint32Array)} */
        this.freqsDist;
        /** @type {!(Array.<number>|Uint8Array)} */
        this.input = input;
        /** @type {!(Array.<number>|Uint8Array)} output output buffer. */
        this.output;
        /** @type {number} pos output buffer position. */
        this.op = 0;

        // option parameters
        if (opt_params) {
            if (opt_params['lazy']) {
                this.lazy = opt_params['lazy'];
            }
            if (typeof opt_params['compressionType'] === 'number') {
                this.compressionType = opt_params['compressionType'];
            }
            if (opt_params['outputBuffer']) {
                this.output = opt_params['outputBuffer'];
            }
            if (typeof opt_params['outputIndex'] === 'number') {
                this.op = opt_params['outputIndex'];
            }
        }

        if (!this.output) {
            this.output = new Uint8Array(0x8000);
        }
    };

    /**
     * @enum {number}
     */
    var Deflate_CompressionType = {
        NONE: 0,
        FIXED: 1,
        DYNAMIC: 2,
        RESERVED: 3
    };

    /**
     * LZ77 の最小マッチ長
     *
     * @const
     * @type {number}
     */
    // var 3 = 3;
    /**
     * LZ77 の最大マッチ長
     *
     * @const
     * @type {number}
     */
    // var Deflate_Lz77MaxLength = 258;
    /**
     * LZ77 のウィンドウサイズ
     *
     * @const
     * @type {number}
     */
    var Deflate_WindowSize = 0x8000;

    /**
     * 最長の符号長
     *
     * @const
     * @type {number}
     */
    var Deflate_MaxCodeLength = 16;

    /**
     * ハフマン符号の最大数値
     *
     * @const
     * @type {number}
     */
    var Deflate_HUFMAX = 286;

    /**
     * 固定ハフマン符号の符号化テーブル
     *
     * @const
     * @type {Array.<Array.<number, number>>}
     */
    var Deflate_FixedHuffmanTable = (function () {
        var table = [], i;

        for (i = 0; i < 288; i++) {
            switch (true) {
                case (i <= 143):
                    table.push([i + 0x030, 8]);
                    break;
                case (i <= 255):
                    table.push([i - 144 + 0x190, 9]);
                    break;
                case (i <= 279):
                    table.push([i - 256 + 0x000, 7]);
                    break;
                case (i <= 287):
                    table.push([i - 280 + 0x0C0, 8]);
                    break;
                default:
                    throw 'invalid literal: ' + i;
            }
        }

        return table;
    })();

    /**
     * DEFLATE ブロックの作成
     *
     * @return {!(Array.<number>|Uint8Array)} 圧縮済み byte array.
     */
    RawDeflate.prototype.compress = function () {
        /** @type {!(Array.<number>|Uint8Array)} */
        var blockArray;
        /** @type {number} */
        var position;
        /** @type {number} */
        var length;

        var input = this.input;

        // compression
        switch (this.compressionType) {
            case Deflate_CompressionType.NONE:
                // each 65535-Byte (length header: 16-bit)
                for (position = 0, length = input.length; position < length;) {
                    blockArray = input.subarray(position, position + 0xffff);
                    position += blockArray.length;
                    this.makeNocompressBlock(blockArray, (position === length));
                }
                break;
            case Deflate_CompressionType.FIXED:
                this.output = this.makeFixedHuffmanBlock(input, true);
                this.op = this.output.length;
                break;
            case Deflate_CompressionType.DYNAMIC:
                this.output = this.makeDynamicHuffmanBlock(input, true);
                this.op = this.output.length;
                break;
            default:
                throw 'invalid compression type';
        }

        return this.output;
    };

    /**
     * 非圧縮ブロックの作成
     *
     * @param {!(Array.
	 *            <number>|Uint8Array)} blockArray ブロックデータ byte array.
     * @param {!boolean}
     *            isFinalBlock 最後のブロックならばtrue.
     * @return {!(Array.<number>|Uint8Array)} 非圧縮ブロック byte array.
     */
    RawDeflate.prototype.makeNocompressBlock = function (blockArray, isFinalBlock) {
        /** @type {number} */
        var bfinal;
        /** @type {Deflate_CompressionType} */
        var btype;
        /** @type {number} */
        var len;
        /** @type {number} */
        var nlen;
        /** @type {number} */
        var i;
        /** @type {number} */
        var il;

        var output = this.output;
        var op = this.op;

        // expand buffer
        output = new Uint8Array(this.output.buffer);
        while (output.length <= op + blockArray.length + 5) {
            output = new Uint8Array(output.length << 1);
        }
        output.set(this.output);

        // header
        bfinal = isFinalBlock ? 1 : 0;
        btype = Deflate_CompressionType.NONE;
        output[op++] = (bfinal) | (btype << 1);

        // length
        len = blockArray.length;
        nlen = (~len + 0x10000) & 0xffff;
        output[op++] = len & 0xff;
        output[op++] = (len >>> 8) & 0xff;
        output[op++] = nlen & 0xff;
        output[op++] = (nlen >>> 8) & 0xff;

        // copy buffer
        output.set(blockArray, op);
        op += blockArray.length;
        output = output.subarray(0, op);

        this.op = op;
        this.output = output;

        return output;
    };

    /**
     * 固定ハフマンブロックの作成
     *
     * @param {!(Array.
	 *            <number>|Uint8Array)} blockArray ブロックデータ byte array.
     * @param {!boolean}
     *            isFinalBlock 最後のブロックならばtrue.
     * @return {!(Array.<number>|Uint8Array)} 固定ハフマン符号化ブロック byte array.
     */
    RawDeflate.prototype.makeFixedHuffmanBlock = function (blockArray, isFinalBlock) {
        /** @type {BitStream} */
        var stream = new BitStream(new Uint8Array(this.output.buffer), this.op);
        /** @type {number} */
        var bfinal;
        /** @type {Deflate_CompressionType} */
        var btype;
        /** @type {!(Array.<number>|Uint16Array)} */
        var data;

        // header
        bfinal = isFinalBlock ? 1 : 0;
        btype = Deflate_CompressionType.FIXED;

        stream.writeBits(bfinal, 1, true);
        stream.writeBits(btype, 2, true);

        data = this.lz77(blockArray);
        this.fixedHuffman(data, stream);

        return stream.finish();
    };

    /**
     * 動的ハフマンブロックの作成
     *
     * @param {!(Array.
	 *            <number>|Uint8Array)} blockArray ブロックデータ byte array.
     * @param {!boolean}
     *            isFinalBlock 最後のブロックならばtrue.
     * @return {!(Array.<number>|Uint8Array)} 動的ハフマン符号ブロック byte array.
     */
    RawDeflate.prototype.makeDynamicHuffmanBlock = function (blockArray, isFinalBlock) {
        /** @type {BitStream} */
        var stream = new BitStream(new Uint8Array(this.output.buffer), this.op);
        /** @type {number} */
        var bfinal;
        /** @type {Deflate_CompressionType} */
        var btype;
        /** @type {!(Array.<number>|Uint16Array)} */
        var data;
        /** @type {number} */
        var hlit;
        /** @type {number} */
        var hdist;
        /** @type {number} */
        var hclen;
        /**
         * @const
         * @type {Array.<number>}
         */
        var hclenOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
        /** @type {!(Array.<number>|Uint8Array)} */
        var litLenLengths;
        /** @type {!(Array.<number>|Uint16Array)} */
        var litLenCodes;
        /** @type {!(Array.<number>|Uint8Array)} */
        var distLengths;
        /** @type {!(Array.<number>|Uint16Array)} */
        var distCodes;
        /**
         * @type {{ codes: !(Array.<number>|Uint32Array), freqs: !(Array.<number>|Uint32Array) }}
         */
        var treeSymbols;
        /** @type {!(Array.<number>|Uint8Array)} */
        var treeLengths;
        /** @type {Array} */
        var transLengths = new Array(19);
        /** @type {!(Array.<number>|Uint16Array)} */
        var treeCodes;
        /** @type {number} */
        var code;
        /** @type {number} */
        var bitlen;
        /** @type {number} */
        var i;
        /** @type {number} */
        var il;

        // header
        bfinal = isFinalBlock ? 1 : 0;
        btype = Deflate_CompressionType.DYNAMIC;

        stream.writeBits(bfinal, 1, true);
        stream.writeBits(btype, 2, true);

        data = this.lz77(blockArray);

        // リテラル・長さ, 距離のハフマン符号と符号長の算出
        litLenLengths = this.getLengths_(this.freqsLitLen, 15);
        litLenCodes = this.getCodesFromLengths_(litLenLengths);
        distLengths = this.getLengths_(this.freqsDist, 7);
        distCodes = this.getCodesFromLengths_(distLengths);

        // HLIT, HDIST の決定
        for (hlit = 286; hlit > 257 && litLenLengths[hlit - 1] === 0; hlit--) {
        }
        for (hdist = 30; hdist > 1 && distLengths[hdist - 1] === 0; hdist--) {
        }

        // HCLEN
        treeSymbols = this.getTreeSymbols_(hlit, litLenLengths, hdist, distLengths);
        treeLengths = this.getLengths_(treeSymbols.freqs, 7);
        for (i = 0; i < 19; i++) {
            transLengths[i] = treeLengths[hclenOrder[i]];
        }
        for (hclen = 19; hclen > 4 && transLengths[hclen - 1] === 0; hclen--) {
        }

        treeCodes = this.getCodesFromLengths_(treeLengths);

        // 出力
        stream.writeBits(hlit - 257, 5, true);
        stream.writeBits(hdist - 1, 5, true);
        stream.writeBits(hclen - 4, 4, true);
        for (i = 0; i < hclen; i++) {
            stream.writeBits(transLengths[i], 3, true);
        }

        // ツリーの出力
        for (i = 0, il = treeSymbols.codes.length; i < il; i++) {
            code = treeSymbols.codes[i];

            stream.writeBits(treeCodes[code], treeLengths[code], true);

            // extra bits
            if (code >= 16) {
                i++;
                switch (code) {
                    case 16:
                        bitlen = 2;
                        break;
                    case 17:
                        bitlen = 3;
                        break;
                    case 18:
                        bitlen = 7;
                        break;
                    default:
                        throw 'invalid code: ' + code;
                }

                stream.writeBits(treeSymbols.codes[i], bitlen, true);
            }
        }

        this.dynamicHuffman(data, [litLenCodes, litLenLengths], [distCodes, distLengths], stream);

        return stream.finish();
    };

    /**
     * 動的ハフマン符号化(カスタムハフマンテーブル)
     *
     * @param {!(Array.
	 *            <number>|Uint16Array)} dataArray LZ77 符号化済み byte array.
     * @param {!BitStream}
     *            stream 書き込み用ビットストリーム.
     * @return {!BitStream} ハフマン符号化済みビットストリームオブジェクト.
     */
    RawDeflate.prototype.dynamicHuffman = function (dataArray, litLen, dist, stream) {
        /** @type {number} */
        var index;
        /** @type {number} */
        var length;
        /** @type {number} */
        var literal;
        /** @type {number} */
        var code;
        /** @type {number} */
        var litLenCodes;
        /** @type {number} */
        var litLenLengths;
        /** @type {number} */
        var distCodes;
        /** @type {number} */
        var distLengths;

        litLenCodes = litLen[0];
        litLenLengths = litLen[1];
        distCodes = dist[0];
        distLengths = dist[1];

        // 符号を BitStream に書き込んでいく
        for (index = 0, length = dataArray.length; index < length; ++index) {
            literal = dataArray[index];

            // literal or length
            stream.writeBits(litLenCodes[literal], litLenLengths[literal], true);

            // 長さ・距離符号
            if (literal > 256) {
                // length extra
                stream.writeBits(dataArray[++index], dataArray[++index], true);
                // distance
                code = dataArray[++index];
                stream.writeBits(distCodes[code], distLengths[code], true);
                // distance extra
                stream.writeBits(dataArray[++index], dataArray[++index], true);
                // 終端
            } else if (literal === 256) {
                break;
            }
        }

        return stream;
    };

    /**
     * 固定ハフマン符号化
     *
     * @param {!(Array.
	 *            <number>|Uint16Array)} dataArray LZ77 符号化済み byte array.
     * @param {!BitStream}
     *            stream 書き込み用ビットストリーム.
     * @return {!BitStream} ハフマン符号化済みビットストリームオブジェクト.
     */
    RawDeflate.prototype.fixedHuffman = function (dataArray, stream) {
        /** @type {number} */
        var index;
        /** @type {number} */
        var length;
        /** @type {number} */
        var literal;

        // 符号を BitStream に書き込んでいく
        for (index = 0, length = dataArray.length; index < length; index++) {
            literal = dataArray[index];

            // 符号の書き込み
            BitStream.prototype.writeBits.apply(stream, Deflate_FixedHuffmanTable[literal]);

            // 長さ・距離符号
            if (literal > 0x100) {
                // length extra
                stream.writeBits(dataArray[++index], dataArray[++index], true);
                // distance
                stream.writeBits(dataArray[++index], 5);
                // distance extra
                stream.writeBits(dataArray[++index], dataArray[++index], true);
                // 終端
            } else if (literal === 0x100) {
                break;
            }
        }

        return stream;
    };

    /**
     * マッチ情報を LZ77 符号化配列で返す. なお、ここでは以下の内部仕様で符号化している [ CODE, EXTRA-BIT-LEN,
     * EXTRA, CODE, EXTRA-BIT-LEN, EXTRA ]
     *
     * @return {!Array.<number>} LZ77 符号化 byte array.
     */
    var toLz77Array = function () {
        /**
         * 長さ符号テーブル. [コード, 拡張ビット, 拡張ビット長] の配列となっている.
         *
         * @const
         * @type {!(Array.<number>|Uint32Array)}
         */
        var lengthCodeTable = new Uint32Array(256);

        for (var length = 3; length <= 258; length++) {
            var arr;
            switch (true) {
                case (length <= 10):
                    arr = [254 + length, 0, 0];
                    break;
                case (length <= 12):
                    arr = [265, length - 11, 1];
                    break;
                case (length <= 14):
                    arr = [266, length - 13, 1];
                    break;
                case (length <= 16):
                    arr = [267, length - 15, 1];
                    break;
                case (length <= 18):
                    arr = [268, length - 17, 1];
                    break;
                case (length <= 22):
                    arr = [269, length - 19, 2];
                    break;
                case (length <= 26):
                    arr = [270, length - 23, 2];
                    break;
                case (length <= 30):
                    arr = [271, length - 27, 2];
                    break;
                case (length <= 34):
                    arr = [272, length - 31, 2];
                    break;
                case (length <= 42):
                    arr = [273, length - 35, 3];
                    break;
                case (length <= 50):
                    arr = [274, length - 43, 3];
                    break;
                case (length <= 58):
                    arr = [275, length - 51, 3];
                    break;
                case (length <= 66):
                    arr = [276, length - 59, 3];
                    break;
                case (length <= 82):
                    arr = [277, length - 67, 4];
                    break;
                case (length <= 98):
                    arr = [278, length - 83, 4];
                    break;
                case (length <= 114):
                    arr = [279, length - 99, 4];
                    break;
                case (length <= 130):
                    arr = [280, length - 115, 4];
                    break;
                case (length <= 162):
                    arr = [281, length - 131, 5];
                    break;
                case (length <= 194):
                    arr = [282, length - 163, 5];
                    break;
                case (length <= 226):
                    arr = [283, length - 195, 5];
                    break;
                case (length <= 257):
                    arr = [284, length - 227, 5];
                    break;
                case (length === 258):
                    arr = [285, length - 258, 0];
                    break;
            }
            lengthCodeTable[length - 3] = arr[0] << 16 | arr[1] << 8 | arr[2];
        }

        var distanceCodeTable = new Uint32Array(32768);
        for (var dist = 1; dist <= 32768; dist++) {
            var r;
            switch (true) {
                case (dist === 1):
                    r = [0, dist - 1, 0];
                    break;
                case (dist === 2):
                    r = [1, dist - 2, 0];
                    break;
                case (dist === 3):
                    r = [2, dist - 3, 0];
                    break;
                case (dist === 4):
                    r = [3, dist - 4, 0];
                    break;
                case (dist <= 6):
                    r = [4, dist - 5, 1];
                    break;
                case (dist <= 8):
                    r = [5, dist - 7, 1];
                    break;
                case (dist <= 12):
                    r = [6, dist - 9, 2];
                    break;
                case (dist <= 16):
                    r = [7, dist - 13, 2];
                    break;
                case (dist <= 24):
                    r = [8, dist - 17, 3];
                    break;
                case (dist <= 32):
                    r = [9, dist - 25, 3];
                    break;
                case (dist <= 48):
                    r = [10, dist - 33, 4];
                    break;
                case (dist <= 64):
                    r = [11, dist - 49, 4];
                    break;
                case (dist <= 96):
                    r = [12, dist - 65, 5];
                    break;
                case (dist <= 128):
                    r = [13, dist - 97, 5];
                    break;
                case (dist <= 192):
                    r = [14, dist - 129, 6];
                    break;
                case (dist <= 256):
                    r = [15, dist - 193, 6];
                    break;
                case (dist <= 384):
                    r = [16, dist - 257, 7];
                    break;
                case (dist <= 512):
                    r = [17, dist - 385, 7];
                    break;
                case (dist <= 768):
                    r = [18, dist - 513, 8];
                    break;
                case (dist <= 1024):
                    r = [19, dist - 769, 8];
                    break;
                case (dist <= 1536):
                    r = [20, dist - 1025, 9];
                    break;
                case (dist <= 2048):
                    r = [21, dist - 1537, 9];
                    break;
                case (dist <= 3072):
                    r = [22, dist - 2049, 10];
                    break;
                case (dist <= 4096):
                    r = [23, dist - 3073, 10];
                    break;
                case (dist <= 6144):
                    r = [24, dist - 4097, 11];
                    break;
                case (dist <= 8192):
                    r = [25, dist - 6145, 11];
                    break;
                case (dist <= 12288):
                    r = [26, dist - 8193, 12];
                    break;
                case (dist <= 16384):
                    r = [27, dist - 12289, 12];
                    break;
                case (dist <= 24576):
                    r = [28, dist - 16385, 13];
                    break;
                case (dist <= 32768):
                    r = [29, dist - 24577, 13];
                    break;
            }

            distanceCodeTable[dist - 1] = r[0] << 24 | r[1] << 8 | r[2];
        }

        var cached = {};
        return function toLz77Array(length, dist) {
            var key = (dist << 9) + length;
            if (cached[key] !== undefined)
                return cached[key];
            var codeLen = lengthCodeTable[length - 3], codeDist = distanceCodeTable[dist - 1];
            return cached[key] = new Uint16Array([codeLen >> 16 & 0xFFFF, codeLen >> 8 & 0xFF, codeLen & 0xFF,
                codeDist >> 24 & 0xFF, codeDist >> 8 & 0xFFFF, codeDist & 0xFF]);
        };
    }();

    /**
     * LZ77 実装
     *
     * @param {!(Array.
	 *            <number>|Uint8Array)} dataArray LZ77 符号化するバイト配列.
     * @return {!(Array.<number>|Uint16Array)} LZ77 符号化した配列.
     */
    RawDeflate.prototype.lz77 = function (dataArray) {
        var length = dataArray.length;
        /**
         * @const
         * @type {number}
         */
        var windowSize = Deflate_WindowSize;
        // assert(windowSize <= 32768)

        /** @type {!(Array.<number>|Uint16Array)} lz77 buffer */
        var lz77buf = new Uint16Array(length << 1);
        /** @type {number} lz77 output buffer pointer */
        var pos = 0;
        /** @type {number} lz77 skip length */
        var skipLength = 0;
        /** @type {!(Array.<number>|Uint32Array)} */
        var freqsLitLen = new Uint32Array(286);
        /** @type {!(Array.<number>|Uint32Array)} */
        var freqsDist = new Uint32Array(30);

        /**
         * 每一个位置对应的key前一次出现的位置与当前位置的距离，用65535填充
         */
        var jumpTable = new Uint16Array(length);
        jumpTable[0] = jumpTable[1] = jumpTable[2] = jumpTable[3] = 65535;
        var n = 4;
        for (var end = length >> 1; n <= end; n <<= 1) {
            jumpTable.set(jumpTable.subarray(0, n), n);
        }
        if (n < length) {
            jumpTable.set(jumpTable.subarray(0, length - n), n);
        }

        /**
         * 每一个key的最后一次出现位置
         */
        var lastPos = {};

        var min = Math.min;

        var matchMaxDistance;

        // 初期化
        freqsLitLen[256] = 1; // EOB の最低出現回数は 1

        // LZ77 符号化
        for (var position = 0, length = dataArray.length; position < length; ++position) {
            // ハッシュキーの作成
            var matchKey = dataArray[position] << 16 | dataArray[position + 1] << 8 | dataArray[position + 2];

            var last = lastPos[matchKey];
            if (last >= 0 && position - last < windowSize) {
                jumpTable[position] = position - last;
                // console.log('set jump distance: ' + position + ' is ' +
                // jumpTable[position]);
            } else { // last === undefined
                last = -65536;
            }
            lastPos[matchKey] = position;

            // skip
            if (skipLength-- > 0) {
                continue;
            }

            // データ末尾でマッチしようがない場合はそのまま流しこむ
            if (position + 3 >= length) {
                for (; position < length; position++) {
                    freqsLitLen[lz77buf[pos++] = dataArray[position]]++;
                }
                break;
            }

            // マッチ候補から最長のものを探す
            // var end = Math.min(258 + position, length);
            var end = min(length, 258 + position);

            // 第一次循环: 从距离>258处开始，尝试查找matchMax===258
            var matchMax = searchMaxMatch(last, 258, windowSize, 3);

            if (matchMax < 258) {
                // 第二次循环: 在距离<258内，尝试查找更大的match
                matchMax = searchMaxMatch(last, matchMax, 258, matchMax);
            }

            if (matchMax > 3) {
                var lz77Array = toLz77Array(matchMax, matchMaxDistance);
                lz77buf.set(lz77Array, pos);
                pos += 6;

                freqsLitLen[lz77Array[0]]++;
                freqsDist[lz77Array[3]]++;
                skipLength = matchMax - 1;
            } else {
                freqsLitLen[lz77buf[pos++] = dataArray[position]]++;
            }
        }

        // 終端処理
        lz77buf[pos++] = 256;
        freqsLitLen[256]++;
        this.freqsLitLen = freqsLitLen;
        this.freqsDist = freqsDist;

        return lz77buf.subarray(0, pos);

        function searchMaxMatch(last, minDistance, maxDistance, matchMax) {
            permatch: for (var distance = position - last, jumpLen; distance < maxDistance; jumpLen = jumpTable[last], distance += jumpLen, last -= jumpLen) {
                if (distance < minDistance)
                    continue;
                for (var j = matchMax - 1; j >= 3; j--) {
                    if (dataArray[last + j] !== dataArray[position + j]) {
                        continue permatch;
                    }
                }

                // 最長一致探索
                var cursor = position + matchMax;
                var tail = min(end, position + distance);
                while (cursor < tail && dataArray[cursor - distance] === dataArray[cursor]) {
                    cursor++;
                }
                var matchLength = cursor - position;

                // マッチ長が同じ場合は後方を優先
                if (matchLength > matchMax) {
                    matchMax = matchLength;
                    matchMaxDistance = distance;
                    if (matchMax === 258) {
                        return 258;
                    }
                }
            }
            return matchMax;
        }

    };

    /**
     * Tree-Transmit Symbols の算出 reference: PuTTY Deflate implementation
     *
     * @param {number}
     *            hlit HLIT.
     * @param {!(Array.
	 *            <number>|Uint8Array)} litlenLengths リテラルと長さ符号の符号長配列.
     * @param {number}
     *            hdist HDIST.
     * @param {!(Array.
	 *            <number>|Uint8Array)} distLengths 距離符号の符号長配列.
     * @return {{ codes: !(Array.<number>|Uint32Array), freqs: !(Array.<number>|Uint32Array) }}
     *         Tree-Transmit Symbols.
     */
    RawDeflate.prototype.getTreeSymbols_ = function (hlit, litlenLengths, hdist, distLengths) {
        var src = new Uint32Array(hlit + hdist), i, j, runLength, l, length, result = new Uint32Array(286 + 30), nResult, rpt, freqs = new Uint8Array(
            19);

        j = 0;
        for (i = 0; i < hlit; i++) {
            src[j++] = litlenLengths[i];
        }
        for (i = 0; i < hdist; i++) {
            src[j++] = distLengths[i];
        }

        // 初期化

        // 符号化
        nResult = 0;
        for (i = 0, l = src.length; i < l; i += j) {
            // Run Length Encoding
            for (j = 1; i + j < l && src[i + j] === src[i]; ++j) {
            }

            runLength = j;

            if (src[i] === 0) {
                // 0 の繰り返しが 3 回未満ならばそのまま
                if (runLength < 3) {
                    while (runLength-- > 0) {
                        result[nResult++] = 0;
                        freqs[0]++;
                    }
                } else {
                    while (runLength > 0) {
                        // 繰り返しは最大 138 までなので切り詰める
                        rpt = (runLength < 138 ? runLength : 138);

                        if (rpt > runLength - 3 && rpt < runLength) {
                            rpt = runLength - 3;
                        }

                        // 3-10 回 -> 17
                        if (rpt <= 10) {
                            result[nResult++] = 17;
                            result[nResult++] = rpt - 3;
                            freqs[17]++;
                            // 11-138 回 -> 18
                        } else {
                            result[nResult++] = 18;
                            result[nResult++] = rpt - 11;
                            freqs[18]++;
                        }

                        runLength -= rpt;
                    }
                }
            } else {
                result[nResult++] = src[i];
                freqs[src[i]]++;
                runLength--;

                // 繰り返し回数が3回未満ならばランレングス符号は要らない
                if (runLength < 3) {
                    while (runLength-- > 0) {
                        result[nResult++] = src[i];
                        freqs[src[i]]++;
                    }
                    // 3 回以上ならばランレングス符号化
                } else {
                    while (runLength > 0) {
                        // runLengthを 3-6 で分割
                        rpt = (runLength < 6 ? runLength : 6);

                        if (rpt > runLength - 3 && rpt < runLength) {
                            rpt = runLength - 3;
                        }

                        result[nResult++] = 16;
                        result[nResult++] = rpt - 3;
                        freqs[16]++;

                        runLength -= rpt;
                    }
                }
            }
        }

        return {
            codes: result.subarray(0, nResult),
            freqs: freqs
        };
    };

    /**
     * ハフマン符号の長さを取得する
     *
     * @param {!(Array.
	 *            <number>|Uint32Array)} freqs 出現カウント.
     * @param {number}
     *            limit 符号長の制限.
     * @return {!(Array.<number>|Uint8Array)} 符号長配列.
     * @private
     */
    RawDeflate.prototype.getLengths_ = function (freqs, limit) {
        /** @type {number} */
        var nSymbols = freqs.length;
        /** @type {Heap} */
        var heap = new Heap(2 * Deflate_HUFMAX);
        /** @type {!(Array.<number>|Uint8Array)} */
        var length = new Uint8Array(nSymbols);
        /** @type {Array} */
        var nodes;
        /** @type {!(Array.<number>|Uint8Array)} */
        var values;
        /** @type {!(Array.<number>|Uint8Array)} */
        var codeLength;
        /** @type {number} */
        var i;
        /** @type {number} */
        var il;
        /** @type {Array.<number>} */
        var freqsZero = [];

        // 配列の初期化

        // ヒープの構築
        for (i = 0; i < nSymbols; ++i) {
            if (freqs[i] > 0) {
                heap.push(i, freqs[i]);
            }
        }
        nodes = new Array(heap.length / 2);
        values = new Uint32Array(heap.length / 2);

        // 非 0 の要素が一つだけだった場合は、そのシンボルに符号長 1 を割り当てて終了
        if (nodes.length === 1) {
            length[heap.pop().index] = 1;
            return length;
        }

        // Reverse Package Merge Algorithm による Canonical Huffman Code
        // の符号長決定
        for (i = 0, il = heap.length / 2; i < il; ++i) {
            nodes[i] = heap.pop();
            values[i] = nodes[i].value;
        }
        codeLength = this.reversePackageMerge_(values, values.length, limit);

        for (i = 0, il = nodes.length; i < il; ++i) {
            length[nodes[i].index] = codeLength[i];
        }

        return length;
    };

    /**
     * Reverse Package Merge Algorithm.
     *
     * @param {!(Array.
	 *            <number>|Uint32Array)} freqs sorted probability.
     * @param {number}
     *            symbols number of symbols.
     * @param {number}
     *            limit code length limit.
     * @return {!(Array.<number>|Uint8Array)} code lengths.
     */
    RawDeflate.prototype.reversePackageMerge_ = function (freqs, symbols, limit) {
        /** @type {!(Array.<number>|Uint16Array)} */
        var minimumCost = new Uint16Array(limit);
        /** @type {!(Array.<number>|Uint8Array)} */
        var flag = new Uint8Array(limit);
        /** @type {!(Array.<number>|Uint8Array)} */
        var codeLength = new Uint8Array(symbols);
        /** @type {Array} */
        var value = new Array(limit);
        /** @type {Array} */
        var type = new Array(limit);
        /** @type {Array.<number>} */
        var currentPosition = new Array(limit);
        /** @type {number} */
        var excess = (1 << limit) - symbols;
        /** @type {number} */
        var half = (1 << (limit - 1));
        /** @type {number} */
        var i;
        /** @type {number} */
        var j;
        /** @type {number} */
        var t;
        /** @type {number} */
        var weight;
        /** @type {number} */
        var next;

        /**
         * @param {number}
         *            j
         */
        function takePackage(j) {
            /** @type {number} */
            var x = type[j][currentPosition[j]];

            if (x === symbols) {
                takePackage(j + 1);
                takePackage(j + 1);
            } else {
                --codeLength[x];
            }

            ++currentPosition[j];
        }

        minimumCost[limit - 1] = symbols;

        for (j = 0; j < limit; ++j) {
            if (excess < half) {
                flag[j] = 0;
            } else {
                flag[j] = 1;
                excess -= half;
            }
            excess <<= 1;
            minimumCost[limit - 2 - j] = (minimumCost[limit - 1 - j] / 2 | 0) + symbols;
        }
        minimumCost[0] = flag[0];

        value[0] = new Array(minimumCost[0]);
        type[0] = new Array(minimumCost[0]);
        for (j = 1; j < limit; ++j) {
            if (minimumCost[j] > 2 * minimumCost[j - 1] + flag[j]) {
                minimumCost[j] = 2 * minimumCost[j - 1] + flag[j];
            }
            value[j] = new Array(minimumCost[j]);
            type[j] = new Array(minimumCost[j]);
        }

        for (i = 0; i < symbols; ++i) {
            codeLength[i] = limit;
        }

        for (t = 0; t < minimumCost[limit - 1]; ++t) {
            value[limit - 1][t] = freqs[t];
            type[limit - 1][t] = t;
        }

        for (i = 0; i < limit; ++i) {
            currentPosition[i] = 0;
        }
        if (flag[limit - 1] === 1) {
            --codeLength[0];
            ++currentPosition[limit - 1];
        }

        for (j = limit - 2; j >= 0; --j) {
            i = 0;
            weight = 0;
            next = currentPosition[j + 1];

            for (t = 0; t < minimumCost[j]; t++) {
                weight = value[j + 1][next] + value[j + 1][next + 1];

                if (weight > freqs[i]) {
                    value[j][t] = weight;
                    type[j][t] = symbols;
                    next += 2;
                } else {
                    value[j][t] = freqs[i];
                    type[j][t] = i;
                    ++i;
                }
            }

            currentPosition[j] = 0;
            if (flag[j] === 1) {
                takePackage(j);
            }
        }

        return codeLength;
    };

    /**
     * 符号長配列からハフマン符号を取得する reference: PuTTY Deflate implementation
     *
     * @param {!(Array.
	 *            <number>|Uint8Array)} lengths 符号長配列.
     * @return {!(Array.<number>|Uint16Array)} ハフマン符号配列.
     * @private
     */
    RawDeflate.prototype.getCodesFromLengths_ = function (lengths) {
        var codes = new Uint16Array(lengths.length), count = [], startCode = [], code = 0, i, il, j, m;

        // Count the codes of each length.
        for (i = 0, il = lengths.length; i < il; i++) {
            count[lengths[i]] = (count[lengths[i]] | 0) + 1;
        }

        // Determine the starting code for each length block.
        for (i = 1, il = Deflate_MaxCodeLength; i <= il; i++) {
            startCode[i] = code;
            code += count[i] | 0;
            code <<= 1;
        }

        // Determine the code for each symbol. Mirrored, of course.
        for (i = 0, il = lengths.length; i < il; i++) {
            code = startCode[lengths[i]];
            startCode[lengths[i]] += 1;
            codes[i] = 0;

            for (j = 0, m = lengths[i]; j < m; j++) {
                codes[i] = (codes[i] << 1) | (code & 1);
                code >>>= 1;
            }
        }

        return codes;
    };

    function deflate(buffer, level, headers, pos) {
        var options = {};
        if (headers) {
            var arr = options.outputBuffer = new Uint8Array(4096);
            arr[0] = 0x78;
            arr[1] = 0x01;
            options.outputIndex = 2;
        }
        var deflater = new RawDeflate(new Uint8Array(buffer, pos), options);
        var out = deflater.compress();
        return out.buffer.slice(out.byteOffset, out.byteOffset + out.length);
    }

    if (obj.zlib) {
        obj.zlib.deflate = function (buffer, level, headers, pos) {
            return Promise.resolve(deflate.apply(null, arguments))
        }
    } else {
        obj.addEventListener("message", function (event) {
            var message = event.data, args = message.args;

            var ret = deflate.apply(null, args);
            obj.postMessage({
                buffer: ret,
                id: message.id
            }, [ret]);
        }, false);
    }

})(this, Uint8Array, Uint16Array, Uint32Array);
