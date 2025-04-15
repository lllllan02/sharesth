package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"

	"sharesth/data"
	"sharesth/handlers"
	"sharesth/utils"
)

func main() {
	// 初始化数据库
	if err := data.InitDB(); err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer data.CloseDB()

	// 初始化Redis客户端
	data.InitRedisClient()
	defer data.CloseRedisClient()

	// 加载已分配的用户ID到内存
	data.LoadAllocatedUserIDs()

	// 创建Gin路由
	r := gin.Default()

	// 设置静态文件目录
	r.Static("/static", "./static")
	r.Static("/uploads", "./uploads")

	// 加载HTML模板
	r.LoadHTMLGlob("templates/*.html")

	// 前端页面路由
	r.GET("/", handlers.IndexHandler)                            // 首页
	r.GET("/my-content", handlers.MyContentPageHandler)          // 我的内容页面
	r.GET("/contents/public", handlers.PublicContentPageHandler) // 公开内容页面
	r.GET("/search", handlers.SourceSearchPageHandler)           // 搜索页面
	r.GET("/:shortID", handlers.ShortLinkHandler)

	// API路由 - 按资源分组
	api := r.Group("/api")
	{
		// 内容相关API
		contents := api.Group("/contents")
		{
			contents.GET("", handlers.MyContentAPIHandler)                         // 获取我的内容列表
			contents.GET("/detail", handlers.ContentDetailHandler)                 // 获取内容详情
			contents.POST("", handlers.ShareHandler)                               // 创建新内容
			contents.DELETE("", handlers.DeleteContentHandler)                     // 删除内容
			contents.PATCH("/visibility", handlers.ToggleContentVisibilityHandler) // 切换可见性
			contents.GET("/public", handlers.PublicContentAPIHandler)              // 获取公开内容
			contents.GET("/search", handlers.SourceContentHandler)                 // 搜索内容
		}

		// 上传相关API
		api.POST("/upload/image", handlers.UploadImageForMD) // Markdown编辑器的图片上传
	}

	// 确保上传目录存在
	os.MkdirAll(utils.UploadsDir, 0755)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默认端口
	}

	log.Printf("服务器启动在: http://localhost:%s", port)
	r.Run(fmt.Sprintf(":%s", port))
}
