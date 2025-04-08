package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"sharesth/models"
)

// ShortLinkHandler 处理短链接访问
func ShortLinkHandler(c *gin.Context) {
	shortID := c.Param("shortID")

	// 检查索引中是否存在此短链接
	content, err := models.LoadContent(shortID)
	if err != nil {
		log.Printf("加载内容失败: %v", err)
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"message": "短链接不存在或内容加载失败",
		})
		return
	}

	log.Printf("访问短链接: %s, 内容类型: %s", shortID, content.Type)

	// 根据内容类型来显示不同的内容
	switch content.Type {
	case "image":
		// 使用图片预览模板
		c.HTML(http.StatusOK, "image.html", gin.H{
			"Title":     content.Title,
			"ImagePath": "/" + content.Data,
		})
	case "text":
		// 对于文本内容，使用文本模板
		c.HTML(http.StatusOK, "text.html", gin.H{
			"Content": content.Data,
			"Title":   content.Title,
		})
	case "markdown", "": // 空类型向后兼容旧版本
		// 对于Markdown内容，使用markdown模板渲染
		// 将内容JSON编码以避免模板转义问题
		contentJSON, err := json.Marshal(content.Data)
		if err != nil {
			log.Printf("JSON编码失败: %v", err)
			c.HTML(http.StatusInternalServerError, "error.html", gin.H{
				"message": "内容处理失败",
			})
			return
		}

		c.HTML(http.StatusOK, "markdown.html", gin.H{
			"Content":     content.Data,
			"Title":       content.Title,
			"ContentJSON": string(contentJSON),
		})
	default:
		// 不支持的内容类型
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"message": "不支持的内容类型",
		})
	}
}
