package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
)

// 存储内容的结构体
type Content struct {
	Type string // "text" 或 "image"
	Data string // 文本内容或图片路径
}

// 存储短链接与内容的映射
var contentMap = make(map[string]Content)

// 生成随机短链接
func generateShortID(length int) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = chars[r.Intn(len(chars))]
	}
	return string(result)
}

// 主页处理函数
func indexHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		http.Error(w, "模板加载失败", http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, nil)
	if err != nil {
		http.Error(w, "模板渲染失败", http.StatusInternalServerError)
		return
	}
}

// 上传内容处理函数
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20) // 10 MB
	if err != nil {
		http.Error(w, "表单解析失败", http.StatusBadRequest)
		return
	}

	// 检查是否有文本内容
	textContent := r.FormValue("text")
	if textContent != "" {
		// 生成短链接
		shortID := generateShortID(6)
		contentMap[shortID] = Content{Type: "text", Data: textContent}

		// 返回短链接
		response := map[string]string{
			"shortLink": fmt.Sprintf("http://%s/%s", r.Host, shortID),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 检查是否有图片上传
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// 确保上传目录存在
		if _, err := os.Stat("uploads"); os.IsNotExist(err) {
			os.Mkdir("uploads", 0755)
		}

		// 创建文件
		filename := filepath.Join("uploads", handler.Filename)
		dst, err := os.Create(filename)
		if err != nil {
			http.Error(w, "无法创建文件", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// 复制文件内容
		if _, err = io.Copy(dst, file); err != nil {
			http.Error(w, "文件上传失败", http.StatusInternalServerError)
			return
		}

		// 生成短链接
		shortID := generateShortID(6)
		contentMap[shortID] = Content{Type: "image", Data: filename}

		// 返回短链接
		response := map[string]string{
			"shortLink": fmt.Sprintf("http://%s/%s", r.Host, shortID),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	http.Error(w, "未提供文本内容或图片", http.StatusBadRequest)
}

// 短链接访问处理函数
func shortLinkHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	shortID := vars["shortID"]

	content, ok := contentMap[shortID]
	if !ok {
		http.Error(w, "短链接不存在", http.StatusNotFound)
		return
	}

	if content.Type == "text" {
		// 显示文本内容
		tmpl, err := template.ParseFiles("templates/text.html")
		if err != nil {
			http.Error(w, "模板加载失败", http.StatusInternalServerError)
			return
		}

		err = tmpl.Execute(w, map[string]string{"Content": content.Data})
		if err != nil {
			http.Error(w, "模板渲染失败", http.StatusInternalServerError)
			return
		}
	} else if content.Type == "image" {
		// 重定向到图片
		http.ServeFile(w, r, content.Data)
	}
}

func main() {
	// 创建必要的目录
	os.MkdirAll("templates", 0755)
	os.MkdirAll("static", 0755)
	os.MkdirAll("uploads", 0755)

	// 创建路由
	r := mux.NewRouter()
	r.HandleFunc("/", indexHandler).Methods("GET")
	r.HandleFunc("/upload", uploadHandler).Methods("POST")
	r.HandleFunc("/{shortID}", shortLinkHandler).Methods("GET")

	// 提供静态文件
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// 启动服务器
	fmt.Println("服务器已启动，访问 http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
