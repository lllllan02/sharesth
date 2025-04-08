package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"sharesth/models"
)

// PublicContentPageHandler 显示公开内容页面
func PublicContentPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "public.html", nil)
}

// PublicContentAPIHandler 获取所有公开内容
func PublicContentAPIHandler(c *gin.Context) {
	// 查询所有公开内容
	results := models.FindPublicContents()

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"count": len(results),
		"items": results,
	})
}
