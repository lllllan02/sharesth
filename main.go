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
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// 存储内容的结构体
type Content struct {
	Type       string    // "text" 或 "image"
	Data       string    // 文本内容或图片路径
	Source     string    // 数据来源（IP地址）
	CreateTime time.Time // 创建时间
	Title      string    // 内容标题
}

// 存储短链接与内容的映射
var contentMap = make(map[string]Content)

// 数据目录路径
const dataDir = "data"

// 索引文件路径
const indexFile = "data/index.json"

// 保存内容到独立文件
func saveContent(shortID string, content Content) error {
	// 确保数据目录存在
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return err
	}

	// 保存索引信息
	contentMap[shortID] = content

	// 内容文件路径
	contentFile := filepath.Join(dataDir, shortID+".json")

	// 将内容保存为JSON文件
	data, err := json.MarshalIndent(content, "", "  ")
	if err != nil {
		return err
	}

	// 写入文件
	if err := os.WriteFile(contentFile, data, 0644); err != nil {
		return err
	}

	// 更新索引文件
	return saveIndex()
}

// 保存索引信息
func saveIndex() error {
	// 创建索引结构，包含短链接ID、内容类型、来源和创建时间
	type IndexEntry struct {
		Type       string
		Source     string
		CreateTime time.Time
		Title      string
	}

	index := make(map[string]IndexEntry)
	for id, content := range contentMap {
		index[id] = IndexEntry{
			Type:       content.Type,
			Source:     content.Source,
			CreateTime: content.CreateTime,
			Title:      content.Title,
		}
	}

	// 将索引转换为JSON
	data, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return err
	}

	// 写入索引文件
	return os.WriteFile(indexFile, data, 0644)
}

// 加载索引信息
func loadIndex() error {
	// 检查索引文件是否存在
	if _, err := os.Stat(indexFile); os.IsNotExist(err) {
		return nil // 文件不存在，不需要加载
	}

	// 读取索引文件
	data, err := os.ReadFile(indexFile)
	if err != nil {
		return err
	}

	// 解析索引数据
	type IndexEntry struct {
		Type       string
		Source     string
		CreateTime time.Time
		Title      string
	}

	index := make(map[string]IndexEntry)
	if err := json.Unmarshal(data, &index); err != nil {
		return err
	}

	// 初始化内容映射
	contentMap = make(map[string]Content)
	for id, entry := range index {
		contentMap[id] = Content{
			Type:       entry.Type,
			Source:     entry.Source,
			CreateTime: entry.CreateTime,
			Title:      entry.Title,
		} // 先不加载内容数据
	}

	return nil
}

// 按需加载内容
func loadContent(shortID string) (Content, error) {
	// 检查内存中是否已有完整数据
	content, exists := contentMap[shortID]
	if exists && content.Data != "" {
		return content, nil
	}

	// 否则从文件加载
	contentFile := filepath.Join(dataDir, shortID+".json")
	data, err := os.ReadFile(contentFile)
	if err != nil {
		return Content{}, err
	}

	// 解析内容数据
	var loadedContent Content
	if err := json.Unmarshal(data, &loadedContent); err != nil {
		return Content{}, err
	}

	// 更新内存缓存
	contentMap[shortID] = loadedContent

	return loadedContent, nil
}

// 查找特定来源的所有内容
func findContentsBySource(source string) []map[string]interface{} {
	var results []map[string]interface{}

	// 遍历内存中的索引
	for id, content := range contentMap {
		if content.Source == source {
			// 添加到结果列表，只包含必要信息
			results = append(results, map[string]interface{}{
				"id":         id,
				"type":       content.Type,
				"createTime": content.CreateTime,
				"link":       "/" + id,
				"title":      content.Title,
			})
		}
	}

	return results
}

// 获取客户端IP地址
func getClientIP(r *http.Request) string {
	// 尝试从X-Forwarded-For获取
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		return ip
	}

	// 尝试从X-Real-IP获取
	ip = r.Header.Get("X-Real-IP")
	if ip != "" {
		return ip
	}

	// 从RemoteAddr获取
	return r.RemoteAddr
}

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

	// 获取客户端IP地址
	clientIP := getClientIP(r)

	// 获取标题（如果没有提供，则使用默认标题）
	title := r.FormValue("title")

	// 检查是否有文本内容
	textContent := r.FormValue("text")
	if textContent != "" {
		// 生成默认标题（如果没有提供）
		if title == "" {
			if len(textContent) > 20 {
				title = textContent[:20] + "..."
			} else {
				title = textContent
			}
		}

		// 生成短链接
		shortID := generateShortID(6)
		content := Content{
			Type:       "text",
			Data:       textContent,
			Source:     clientIP,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到文件
		if err := saveContent(shortID, content); err != nil {
			log.Printf("保存内容失败: %v", err)
			http.Error(w, "保存内容失败", http.StatusInternalServerError)
			return
		}

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

		// 生成默认标题（如果没有提供）
		if title == "" {
			title = "图片: " + handler.Filename
		}

		// 生成短链接
		shortID := generateShortID(6)
		content := Content{
			Type:       "image",
			Data:       filename,
			Source:     clientIP,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到文件
		if err := saveContent(shortID, content); err != nil {
			log.Printf("保存内容失败: %v", err)
			http.Error(w, "保存内容失败", http.StatusInternalServerError)
			return
		}

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

// 查询特定来源的所有内容
func sourceContentHandler(w http.ResponseWriter, r *http.Request) {
	// 获取查询参数中的来源
	source := r.URL.Query().Get("source")
	if source == "" {
		http.Error(w, "缺少来源参数", http.StatusBadRequest)
		return
	}

	// 查询所有来自该来源的内容
	results := findContentsBySource(source)

	// 返回JSON结果
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"source": source,
		"count":  len(results),
		"items":  results,
	})
}

// 查询页面处理函数
func sourceSearchPageHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/source_search.html")
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

// 查询特定来源的所有内容
func myContentHandler(w http.ResponseWriter, r *http.Request) {
	// 获取客户端IP
	clientIP := getClientIP(r)

	// 查询所有来自该IP的内容
	results := findContentsBySource(clientIP)

	// 检查Accept头，确定返回类型
	acceptHeader := r.Header.Get("Accept")
	if strings.Contains(acceptHeader, "application/json") {
		// 返回JSON结果
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"source": clientIP,
			"count":  len(results),
			"items":  results,
		})
	} else {
		// 返回HTML页面
		tmpl, err := template.ParseFiles("templates/my_content.html")
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
}

// 短链接访问处理函数
func shortLinkHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	shortID := vars["shortID"]

	// 检查索引中是否存在此短链接
	_, ok := contentMap[shortID]
	if !ok {
		http.Error(w, "短链接不存在", http.StatusNotFound)
		return
	}

	// 按需加载内容
	content, err := loadContent(shortID)
	if err != nil {
		log.Printf("加载内容失败: %v", err)
		http.Error(w, "加载内容失败", http.StatusInternalServerError)
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
	os.MkdirAll(dataDir, 0755)

	// 加载索引信息
	if err := loadIndex(); err != nil {
		log.Printf("加载索引失败: %v", err)
	}

	// 创建路由
	r := mux.NewRouter()
	r.HandleFunc("/", indexHandler).Methods("GET")
	r.HandleFunc("/upload", uploadHandler).Methods("POST")
	r.HandleFunc("/my-content", myContentHandler).Methods("GET")
	r.HandleFunc("/search", sourceSearchPageHandler).Methods("GET")
	r.HandleFunc("/api/source-content", sourceContentHandler).Methods("GET")
	r.HandleFunc("/{shortID}", shortLinkHandler).Methods("GET")

	// 提供静态文件
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// 启动服务器
	fmt.Println("服务器已启动，访问 http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
