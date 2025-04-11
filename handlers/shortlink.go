package handlers

import (
	"log"
	"net/http"
	"sharesth/data"

	"github.com/gin-gonic/gin"
)

// ShortLinkHandler 处理短链接访问
func ShortLinkHandler(c *gin.Context) {
	// 获取短链接ID
	shortID := c.Param("shortID")

	// 加载内容
	content, err := data.LoadContent(shortID)
	if err != nil {
		log.Printf("加载内容失败: %v", err)
		c.String(http.StatusNotFound, "未找到内容或链接已失效")
		return
	}

	// 获取当前访问者的客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 判断当前用户是否是内容创建者
	isOwner := content.Source == clientIdentifier

	// 根据内容类型处理
	switch content.Type {
	case "markdown":
		// 渲染Markdown内容页面
		c.HTML(http.StatusOK, "markdown.html", gin.H{
			"title":      content.Title,
			"content":    content.Data,
			"createTime": content.CreateTime,
			"updateTime": content.UpdateTime,
			"isOwner":    isOwner,
			"shortID":    content.ShortID,
		})
	case "text":
		c.HTML(http.StatusOK, "text.html", gin.H{
			"title":      content.Title,
			"content":    content.Data,
			"createTime": content.CreateTime,
			"updateTime": content.UpdateTime,
			"isOwner":    isOwner,
			"shortID":    content.ShortID,
		})
	case "image":
		// 渲染图片内容页面
		c.HTML(http.StatusOK, "image.html", gin.H{
			"title":      content.Title,
			"imagePath":  content.Data,
			"createTime": content.CreateTime,
			"updateTime": content.UpdateTime,
			"isOwner":    isOwner,
			"shortID":    content.ShortID,
		})
	default:
		c.String(http.StatusBadRequest, "不支持的内容类型")
	}
}
