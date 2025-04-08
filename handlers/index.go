package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// IndexHandler 主页处理函数
func IndexHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", nil)
}
