package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"sharesth/models"
	"sharesth/utils"
)

// MyContentPageHandler 显示当前用户内容页面
func MyContentPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "my_content.html", nil)
}

// MyContentAPIHandler 返回当前用户内容的JSON数据
func MyContentAPIHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := utils.GetClientIdentifier(c.Request)

	// 查询所有来自该客户端的内容
	results := models.FindContentsBySource(clientIdentifier)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source": clientIdentifier,
		"count":  len(results),
		"items":  results,
	})
}
