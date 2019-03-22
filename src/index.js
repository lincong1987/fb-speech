/**
 * @class FireBirdRecorder
 * 
 * @see https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createScriptProcessor#%E6%B5%8F%E8%A7%88%E5%99%A8%E5%85%BC%E5%AE%B9%E6%80%A7
 * 
 */
class FireBirdRecorder {

    init(options) {
        return new Promise((resolve, reject) => {

            if (!this.support) {
                reject('当前浏览器不支持录音功能。');
                return;
            }

            navigator.getUserMedia({ audio: true }, (stream) => {

                resolve(this.render(stream, options));
            }, (error) => {

                switch (error.code || error.name) {
                    case 'PERMISSION_DENIED':
                    case 'PermissionDeniedError':
                        reject('权限不足');
                        break;
                    case 'NOT_SUPPORTED_ERROR':
                    case 'NotSupportedError':
                        reject('不支持的硬件设备');
                        break;
                    case 'MANDATORY_UNSATISFIED_ERROR':
                    case 'MandatoryUnsatisfiedError':
                        reject('无法发现指定的硬件设备');
                        break;
                    default:
                        reject('无法打开麦克风。异常信息:' + (error.code || error.name));
                        break;
                }
            });
        });
    }

    render(stream, options) {

        this.config = Object.assign({}, {
            // 采样数位 8, 16
            sampleBits: 8,
            // 采样率(1/6 44100)
            sampleRate: 16000,
            // 缓冲区大小
            bufferSize: 4096,
            // 值为整数，用于指定输入node的声道的数量，默认值是2，最高能取32.
            numberOfInputChannels: 1,
            // 值为整数，用于指定输出node的声道的数量，默认值是2，最高能取32.
            numberOfOutputChannels: 1

        }, options);

        //创建一个音频环境对象
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.source = this.audioCtx.createMediaStreamSource(stream);

        // @see https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createScriptProcessor
        let createScript = this.audioCtx.createScriptProcessor || this.audioCtx.createJavaScriptNode;
        // 第二个和第三个参数指的是输入和输出都是单声道,2是双声道。
        // 创建处理器
        this.recorder = createScript.apply(this.audioCtx, [this.config.bufferSize, this.config.numberOfInputChannels, this.config.numberOfOutputChannels]);

        this.recorder.onaudioprocess = (e) => {
            this.audioData.input(e.inputBuffer.getChannelData(0));
        }

        this.audioData = {
            size: 0, //录音文件长度
            buffer: [], //录音缓存
            inputSampleRate: this.audioCtx.sampleRate, //输入采样率
            inputSampleBits: 16, //输入采样数位 8, 16
            outputSampleRate: this.config.sampleRate, //输出采样率
            oututSampleBits: this.config.sampleBits, //输出采样数位 8, 16
            input: function (data) {
                this.buffer.push(new Float32Array(data));
                this.size += data.length;
            },
            compress: function () { //合并压缩
                //合并
                var data = new Float32Array(this.size);
                var offset = 0;
                for (var i = 0; i < this.buffer.length; i++) {
                    data.set(this.buffer[i], offset);
                    offset += this.buffer[i].length;
                }
                //压缩
                var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
                var length = data.length / compression;
                var result = new Float32Array(length);
                var index = 0,
                    j = 0;
                while (index < length) {
                    result[index] = data[j];
                    j += compression;
                    index++;
                }
                return result;
            },
            encodeWAV: function () {
                var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
                var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
                var bytes = this.compress();
                var dataLength = bytes.length * (sampleBits / 8);
                var buffer = new ArrayBuffer(44 + dataLength);
                var data = new DataView(buffer);
                var channelCount = 1; //单声道
                var offset = 0;
                var writeString = function (str) {
                    for (var i = 0; i < str.length; i++) {
                        data.setUint8(offset + i, str.charCodeAt(i));
                    }
                }
                // 资源交换文件标识符
                writeString('RIFF');
                offset += 4;
                // 下个地址开始到文件尾总字节数,即文件大小-8
                data.setUint32(offset, 36 + dataLength, true);
                offset += 4;
                // WAV文件标志
                writeString('WAVE');
                offset += 4;
                // 波形格式标志
                writeString('fmt ');
                offset += 4;
                // 过滤字节,一般为 0x10 = 16
                data.setUint32(offset, 16, true);
                offset += 4;
                // 格式类别 (PCM形式采样数据)
                data.setUint16(offset, 1, true);
                offset += 2;
                // 通道数
                data.setUint16(offset, channelCount, true);
                offset += 2;
                // 采样率,每秒样本数,表示每个通道的播放速度
                data.setUint32(offset, sampleRate, true);
                offset += 4;
                // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
                data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true);
                offset += 4;
                // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
                data.setUint16(offset, channelCount * (sampleBits / 8), true);
                offset += 2;
                // 每样本数据位数
                data.setUint16(offset, sampleBits, true);
                offset += 2;
                // 数据标识符
                writeString('data');
                offset += 4;
                // 采样数据总数,即数据总大小-44
                data.setUint32(offset, dataLength, true);
                offset += 4;
                // 写入采样数据
                if (sampleBits === 8) {
                    for (var i = 0; i < bytes.length; i++ , offset++) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        val = parseInt(255 / (65535 / (val + 32768)));
                        data.setInt8(offset, val, true);
                    }
                } else {
                    for (var i = 0; i < bytes.length; i++ , offset += 2) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    }
                }
                return new Blob([data], { type: 'audio/wav' });
            }
        };


    }

    /**
     * @param {Object} options 配置     
     * options.sampleBits - 采样数位 8, 16
     * options.sampleRate - 采样率 16000
     */
    constructor(options) {

        window.URL = window.URL || window.webkitURL;

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        this.support = navigator.getUserMedia != null && window.AudioContext != null;

        return (async () => {
            await this.init(options);
            return this;
        })();
    }




    //开始录音
    start() {
        this.audioData.size = 0;
        this.audioData.buffer = [];
        this.source.connect(this.recorder);
        this.recorder.connect(this.audioCtx.destination);
    }

    //停止
    stop() {
        this.recorder.disconnect();
    }

    //获取音频文件
    getBlob() {
        this.stop();
        return this.audioData.encodeWAV();
    }

    getBase64() {
        this.stop();
        return this.audioData.encodeWAV();
    }

    //回放
    play(audio) {
        let blob = this.getBlob()
        audio.src = window.URL.createObjectURL(blob);
        audio.controls = true;
        return blob;
    }
    //清除
    clear() {
        this.audioData.buffer = [];
        this.audioData.size = 0;
    }

}


module.exports = FireBirdRecorder;