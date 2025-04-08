package handlers

import (
	"fmt"
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

// ToggleContentVisibilityHandler 切换内容的公开/隐藏状态
func ToggleContentVisibilityHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := utils.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.PostForm("content_id")
	if contentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
		return
	}

	// 获取当前用户拥有的内容
	var content models.Content
	result := models.DB.Where("short_id = ? AND source = ?", contentID, clientIdentifier).First(&content)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "内容不存在或您无权修改"})
		return
	}

	// 切换公开状态
	content.IsPublic = !content.IsPublic

	// 保存更改
	result = models.DB.Save(&content)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新内容状态失败"})
		return
	}

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"is_public": content.IsPublic,
		"message": fmt.Sprintf("内容已设为%s", func() string {
			if content.IsPublic {
				return "公开"
			}
			return "不公开"
		}()),
	})
}
