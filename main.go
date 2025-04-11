package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"

	"sharesth/handlers"
	"sharesth/models"
	"sharesth/utils"
)

func main() {
	// 初始化数据库
	if err := models.InitDB(); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer models.CloseDB()

	// 加载已分配的用户ID到内存
	utils.LoadAllocatedUserIDs()

	// 创建Gin路由
	r := gin.Default()

	// 设置静态文件目录
	r.Static("/static", "./static")
	r.Static("/uploads", "./uploads")

	// 加载HTML模板
	r.LoadHTMLGlob("templates/*.html")

	// 路由配置
	r.GET("/", handlers.IndexHandler)
	r.POST("/share", handlers.ShareHandler)
	r.POST("/upload/image", handlers.UploadImageForMD) // Markdown编辑器的图片上传
	r.GET("/my-content", handlers.MyContentPageHandler)
	r.GET("/api/my-content", handlers.MyContentAPIHandler)
	r.POST("/api/toggle-visibility", handlers.ToggleContentVisibilityHandler)
	r.POST("/api/delete-content", handlers.DeleteContentHandler)
	r.GET("/search", handlers.SourceSearchPageHandler)
	r.GET("/api/source-content", handlers.SourceContentHandler)
	r.GET("/public", handlers.PublicContentPageHandler)
	r.GET("/api/public-content", handlers.PublicContentAPIHandler)
	r.GET("/:shortID", handlers.ShortLinkHandler)

	// 确保上传目录存在
	os.MkdirAll("uploads", 0755)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默认端口
	}

	log.Printf("服务器启动在: http://localhost:%s", port)
	r.Run(fmt.Sprintf(":%s", port))
}
