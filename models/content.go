package models

import (
	"time"
)

// Content 存储内容的结构体
type Content struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	ShortID    string    `json:"short_id" gorm:"type:varchar(10);uniqueIndex"`
	Type       string    `json:"type" gorm:"type:varchar(10)"`          // "text", "markdown" 或 "image"
	Data       string    `json:"data" gorm:"type:text"`                 // 文本内容或图片路径
	Source     string    `json:"source" gorm:"type:varchar(100);index"` // 数据来源（IP地址）
	CreateTime time.Time `json:"create_time" gorm:"index"`              // 创建时间
	Title      string    `json:"title" gorm:"type:varchar(255)"`        // 内容标题
}

// 数据目录路径
const DataDir = "data"

// 索引文件路径
const IndexFile = "data/index.json"

// 构建表名
func (Content) TableName() string {
	return "contents"
}

// FileMD5 存储文件MD5与路径的映射关系
type FileMD5 struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	MD5Hash   string    `json:"md5_hash" gorm:"type:varchar(32);uniqueIndex"`
	FilePath  string    `json:"file_path" gorm:"type:varchar(255)"`
	CreatedAt time.Time `json:"created_at"`
}

func (FileMD5) TableName() string {
	return "file_md5s"
}
