package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"sharesth/data"
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

	// 根据内容类型处理
	switch content.Type {
	case "markdown":
		// 渲染Markdown内容页面
		c.HTML(http.StatusOK, "markdown.html", gin.H{
			"title":   content.Title,
			"content": content.Data,
		})
	case "text":
		// 渲染纯文本内容页面，将换行符转换为<br>
		htmlContent := strings.ReplaceAll(content.Data, "\n", "<br>")
		c.HTML(http.StatusOK, "text.html", gin.H{
			"title":   content.Title,
			"content": htmlContent,
		})
	case "image":
		// 渲染图片内容页面
		c.HTML(http.StatusOK, "image.html", gin.H{
			"title":     content.Title,
			"imagePath": content.Data,
		})
	default:
		c.String(http.StatusBadRequest, "不支持的内容类型")
	}
}
