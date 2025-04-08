package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"sharesth/utils"
)

// MyContentPageHandler 显示当前用户内容页面
func MyContentPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "my_content.html", nil)
}

// MyContentAPIHandler 返回当前用户内容的JSON数据
func MyContentAPIHandler(c *gin.Context) {
	// 获取客户端IP
	clientIP := utils.GetClientIP(c.Request)

	// 查询所有来自该IP的内容
	results := utils.FindContentsBySource(clientIP)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source": clientIP,
		"count":  len(results),
		"items":  results,
	})
}
