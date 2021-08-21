var text = function (toUser, fromUser, timeStamp, content) {

  return `<xml>
            <ToUserName><![CDATA[${toUser}]]></ToUserName>
            <FromUserName><![CDATA[${fromUser}]]></FromUserName>
            <CreateTime>${timeStamp}</CreateTime>
            <MsgType><![CDATA[text]]></MsgType>
            <Content><![CDATA[${content}]]></Content>
          </xml>`;
};

var news = function (toUser, fromUser, timeStamp, newsContent) {
  var length = newsContent.length;
  var content = '';
  for(var i = 0; i < length; i++) {
    var item = newsContent[i];
    content += `<item>
                     <Title><![CDATA[${item.title}]]></Title> 
                     <Description><![CDATA[${item.description}]]></Description>
                     <PicUrl><![CDATA[${item.picUrl}]]></PicUrl>
                     <Url><![CDATA[${item.url}]]></Url>
                </item>` + '\n';
  }

  return `<xml>
             <ToUserName><![CDATA[${toUser}]]></ToUserName>
             <FromUserName><![CDATA[${fromUser}]]></FromUserName>
             <CreateTime>${timeStamp}</CreateTime>
             <MsgType><![CDATA[news]]></MsgType>
             <ArticleCount>${length}</ArticleCount>
             <Articles>
                 ${content}
             </Articles>
          </xml>`;
};

// https://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%8A%E4%BC%A0%E4%B8%B4%E6%97%B6%E7%B4%A0%E6%9D%90%E6%96%87%E4%BB%B6
var image = function (toUser, fromUser, timeStamp, mediaId) {

  return `<xml>
             <ToUserName><![CDATA[${toUser}]]></ToUserName>
             <FromUserName><![CDATA[${fromUser}]]></FromUserName>
             <CreateTime>${timeStamp}</CreateTime>
             <MsgType><![CDATA[image]]></MsgType>
             <Image>
                 <MediaId><![CDATA[${mediaId}]]></MediaId>
             </Image>
          </xml>`;
}

module.exports = {
  text: text, // 普通文本消息
  news: news, // 图文消息
  image: image, // 图片消息
};
