package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"sharesth/utils"
)

// ShortLinkHandler 处理短链接访问
func ShortLinkHandler(c *gin.Context) {
	shortID := c.Param("shortID")

	// 检查索引中是否存在此短链接
	content, err := utils.LoadContent(shortID)
	if err != nil {
		log.Printf("加载内容失败: %v", err)
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"message": "短链接不存在或内容加载失败",
		})
		return
	}

	if content.Type == "text" {
		// 显示文本内容
		c.HTML(http.StatusOK, "text.html", gin.H{
			"Content": content.Data,
			"Title":   content.Title,
		})
	} else if content.Type == "image" {
		// 重定向到图片
		c.File(content.Data)
	} else {
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"message": "不支持的内容类型",
		})
	}
}
