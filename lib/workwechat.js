var request = require('request');
// var crypto = require('crypto');
var XMLParser = require('xml2js');
var thunkify = require('thunkify');
var Templates = require('./templates');
var util = require('util');

var path = require('path');
var fs = require('fs');

var crypto = require('@wecom/crypto');

var parseXML = thunkify(XMLParser.parseString);

var buildXML = new XMLParser.Builder({
  rootName:'xml',
  cdata:true,
  headless:true,
  renderOpts: {
    indent:' ',
    pretty:'true'
  }
});

var base = {
  url: 'https://qyapi.weixin.qq.com/cgi-bin',
};

var WorkWechat = function (options) {
  this.options = options;
  // this.res = null;
  this.secret = this.options.secret;
  this.agentid = this.options.agentid;
  this.touser = this.options.touser;
  // 验证 URL 所需参数
  this.token = this.options.token;
  this.corpid = this.options.corpid;
  this.aesKey = new Buffer(this.options.encodingAESKey + '=', 'base64');
  this.iv = this.aesKey.slice(0, 16);

}

WorkWechat.prototype = {
  constructor: WorkWechat,
  timestamp (delay) {
    delay = Number(delay) || 0;
    return parseInt(new Date().valueOf() / 1000) + delay * 1000;
  },
  PKCS7Decoder (buff) {
    var pad = buff[buff.length - 1];
    if (pad < 1 || pad > 32) {
      pad = 0;
    }
    return buff.slice(0, buff.length - pad);
  },
  encrypt (xmlMsg) {
    /*var random16 = crypto.pseudoRandomBytes(16);
    var msg = new Buffer(xmlMsg);
    var msgLength = new Buffer(4);
    msgLength.writeUInt32BE(msg.length, 0);
    var corpid = new Buffer(this.corpid);
    var rawMsg = Buffer.concat([random16, msgLength, msg, corpid]);
    var cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.iv);
    var cipheredMsg = Buffer.concat([cipher.update(rawMsg), cipher.final()]);

    console.log('加密结果：' + cipheredMsg.toString('base64'));
    console.log('---------------');
    console.log('解密结果：' + this.decrypt(cipheredMsg.toString('base64')));

    return cipheredMsg.toString('base64');*/
    // var cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.iv);

    const ciphered = crypto.encrypt(this.options.encodingAESKey, xmlMsg, this.corpid);
    console.log('加密结果：', ciphered);
    return ciphered;
  },
  decrypt (echostr) {
    /*var aesCipher = crypto.createDecipheriv("aes-256-cbc", this.aesKey, this.iv);
    aesCipher.setAutoPadding(false);
    var decipheredBuff = Buffer.concat([aesCipher.update(echostr, 'base64'), aesCipher.final()]);
    decipheredBuff = this.PKCS7Decoder(decipheredBuff);
    var len_netOrder_corpid = decipheredBuff.slice(16);
    var msg_len = len_netOrder_corpid.slice(0, 4).readUInt32BE(0);
    var result = len_netOrder_corpid.slice(4, msg_len + 4).toString();

    return result; // 返回一个解密后的明文*/

    const { message, id } = crypto.decrypt(this.options.encodingAESKey, echostr);
    console.log('解密结果：', { message, id });
    return message;
  },
  getSignature (token, timestamp, nonce, echostr) {

    /*var key =  [token, timestamp, nonce, echostr].sort().join('');
    var sha1 = crypto.createHash('sha1');
    sha1.update(key);

    return sha1.digest('hex');*/
    return crypto.getSignature(token, timestamp, nonce, echostr);
  },
  verifyURL (signature, token, timestamp, nonce, echostr) {
    return this.getSignature(token, timestamp, nonce, echostr) == signature;
  },
  // 消息加密
  encryptMsg (replyMsg, opts) {
    var result = {};
    var options = opts || {};

    var encrypt = this.encrypt(replyMsg);
    var nonce = options.nonce || parseInt((Math.random() * 10000000000), 10);
    var timestamp = options.timestamp || this.timestamp();
    var msgsignature = this.getSignature(this.token, timestamp, nonce, encrypt);
    // 标准回包
    var resXml = `
      <xml>
        <Encrypt><![CDATA[${encrypt}]]></Encrypt>
        <MsgSignature><![CDATA[${msgsignature}]]></MsgSignature>
        <TimeStamp>${timestamp}</TimeStamp>
        <Nonce><![CDATA[${nonce}]]></Nonce>
      </xml>
    `;

    return resXml;
    // result.Encrypt = this.encrypt(replyMsg);
    // result.Nonce = options.nonce || parseInt((Math.random() * 10000000000), 10);
    // result.TimeStamp = options.timestamp || this.timestamp();
    // result.MsgSignature = this.getSignature(this.token, result.TimeStamp, result.Nonce, result.Encrypt);
    // return buildXML.buildObject(result);
  },
  // 消息解密
  decryptMsg (msgSignature, token, timestamp, nonce, echostr) {
    var msgEncrypt = echostr.Encrypt;
    if (this.getSignature(token, timestamp, nonce, msgEncrypt) != msgSignature) {
      console.log('消息签名不一致');
      return false;
    }
    var decryptedMsg = this.decrypt(msgEncrypt);
    return parseXML(decryptedMsg, {explicitArray: false});
  },
  /**
   * 解析请求中的文字信息
   * eg.
   * <xml>
   *   ...
   *   <Content>hello world</Content>
   * </xml>
   *
   * return hello world
   */
  async getMsg (req) {
    var xmlMsg = this.decrypt(req.body.xml.Encrypt[0]);
	console.log('原始xmlMsg:', xmlMsg);
    // var data = null;
	var parser = new XMLParser.Parser();
	var data = await util.promisify(parser.parseString)(xmlMsg);
    /* XMLParser.parseString(xmlMsg, function (err, result) {
      data = result;
    }); */
	console.log(data)
    return data.xml.Content[0];
  },
  async getMsgObj (req) {
    var xmlMsg = this.decrypt(req.body.xml.Encrypt[0]);
	console.log('原始xmlMsg:', xmlMsg);
    // var data = null;
	var parser = new XMLParser.Parser();
	var data = await util.promisify(parser.parseString)(xmlMsg);
    /* XMLParser.parseString(xmlMsg, function (err, result) {
      data = result;
    }); */
    console.log(data)
    return data.xml;
  },
  // 获取 access_token
  getAccessToken () {
    var url = `${base.url}/gettoken?corpid=${ this.corpid }&corpsecret=${ this.secret }`;
    var options = {
      method: 'GET',
      url: url
    };
    return new Promise((resolve, reject) => {
      request(options, function (err, res, body) {
        if (res) {
          resolve(JSON.parse(body));
        } else {
          reject(err);
        }
      });
    });
  },
  async getToken () {
    /* this.getAccessToken().then(res => {
      var token = res['access_token'];
      fs.writeFile(path.resolve(__dirname,'./token'), token, function (err) {
        console.log('token saved.');
      });
    }); */
	let res = await this.getAccessToken();
	console.log('get access token', res);
	var token = res['access_token'];
	console.log('token', token);
	fs.writeFileSync(path.resolve(__dirname,'./token'), token);
	console.log('file write successfully', path.resolve(__dirname,'./token'));
	
	return token;
  },
  updateToken () {
    this.saveToken();
    /* setInterval(function () {
      await this.saveToken();
    }, 7000 * 1000); // ≈ 2h */
  },
  /**
   * 接收消息服务器配置
   */
  connectServer (req) {
      var msg = req.query;
      if (this.verifyURL(msg.msg_signature, this.token, msg.timestamp, msg.nonce, msg.echostr)) {
        return this.decrypt(msg.echostr);
      } else {
        console.log('Error!');
        return "";
      }
  },
  /**
   * 被动回复消息
   * @param {Object} options - 配置对象{type:[text|image|...], content: ['hello'|'hi, <a>...</a>']}
   */
  reply(options) {
    var config = {
      toUser: this.touser,
    };
    console.log(options)
    // this.res.writeHead(200, {'Content-Type': 'application/xml'});
    var resMsg = Templates[options.type](config.toUser, this.corpid, this.timestamp(), options.content);
    console.log('resMsg')
    console.log(resMsg)
    var msgEncrypt = this.encryptMsg(resMsg);
    console.log(msgEncrypt)
    return {
      header: {'Content-Type': 'application/xml'},
      body: msgEncrypt
    };
  },
  /**
   * 主动发送消息 (可继续封装完善)
   */
  sendMsg (msg) {
    var token = fs.readFileSync(path.resolve(__dirname,'./token')).toString();
    var texts = {
      "touser" : this.userId,
      "msgtype" : "text",
      "agentid" : this.agentid,
      "text" : {
          "content" : msg
      }
    };

    var options = {
      url: base.url + '/message/send?access_token=' + token,
      form: JSON.stringify(texts)
    };

    request.post(options, function(err,res, body) {
      if (err) {
        console.log(err);
      }
    });
  },
};

module.exports = WorkWechat;
