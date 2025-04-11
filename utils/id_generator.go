package utils

import (
	"math/rand"
	"time"
)

// GenerateShortID 生成指定长度的随机短链接ID
func GenerateShortID(length int) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = chars[r.Intn(len(chars))]
	}
	return string(result)
}

// SimpleHash 简单哈希函数，与前端JavaScript的哈希算法相似
func SimpleHash(s string) uint32 {
	var total uint32 = 0
	for i := 0; i < len(s); i++ {
		// 使用相同的算法：total = total * 31 + char
		total = (total*31 + uint32(s[i])) & 0xFFFFFFFF
	}
	return total
}
