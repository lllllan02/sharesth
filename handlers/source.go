package handlers

import (
	"net/http"
	"sharesth/models"

	"github.com/gin-gonic/gin"
)

// SourceSearchPageHandler 显示查询用户分享记录页面
func SourceSearchPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "source_search.html", nil)
}

// SourceContentHandler 根据来源查询内容
func SourceContentHandler(c *gin.Context) {
	// 获取查询参数中的来源
	source := c.Query("source")
	if source == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少来源参数"})
		return
	}

	// 查询所有来自该来源的内容
	results := models.FindContentsBySource(source)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source": source,
		"count":  len(results),
		"items":  results,
	})
}
