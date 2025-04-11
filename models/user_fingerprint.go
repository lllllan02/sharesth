package models

import (
	"time"
)

// UserFingerprint 存储用户浏览器指纹信息与用户ID的对应关系
type UserFingerprint struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	BrowserHash string    `json:"browser_hash" gorm:"type:varchar(64);uniqueIndex"` // 浏览器特征的哈希值
	UserID      string    `json:"user_id" gorm:"type:varchar(10)"`                  // 分配给用户的唯一标识
	BrowserInfo string    `json:"browser_info" gorm:"type:text"`                    // 详细的浏览器信息
	CreatedAt   time.Time `json:"created_at"`                                       // 首次创建时间
	LastSeenAt  time.Time `json:"last_seen_at"`                                     // 最近访问时间
}

// TableName 指定表名
func (UserFingerprint) TableName() string {
	return "user_fingerprints"
}
