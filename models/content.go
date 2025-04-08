package models

import (
	"time"
)

// Content 存储内容的结构体
type Content struct {
	Type       string    // "text" 或 "image"
	Data       string    // 文本内容或图片路径
	Source     string    // 数据来源（IP地址）
	CreateTime time.Time // 创建时间
	Title      string    // 内容标题
}

// 数据目录路径
const DataDir = "data"

// 索引文件路径
const IndexFile = "data/index.json"

// ContentMap 存储短链接与内容的映射
var ContentMap = make(map[string]Content)
