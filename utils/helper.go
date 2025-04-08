package utils

import (
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

// Cookie相关常量
const (
	ClientFingerprintCookieName = "clientFingerprint" // 客户端指纹Cookie名称
)

// 生成随机短链接
func GenerateShortID(length int) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = chars[r.Intn(len(chars))]
	}
	return string(result)
}

// 获取客户端标识
func GetClientIdentifier(r *http.Request) string {
	// 首先尝试从Cookie中获取指纹标识
	fingerprintCookie, err := r.Cookie(ClientFingerprintCookieName)
	if err == nil && fingerprintCookie.Value != "" {
		return fingerprintCookie.Value
	}

	// 如果没有Cookie，尝试使用与前端JavaScript类似的算法生成一个一致的标识符
	// 获取更稳定的浏览器特征
	ua := r.UserAgent()
	acceptLang := r.Header.Get("Accept-Language")

	// 模拟前端的指纹生成逻辑，使用最稳定的参数
	stableParams := []string{
		ua,                        // User Agent
		acceptLang,                // 语言首选项
		r.Header.Get("Sec-Ch-Ua"), // 浏览器品牌信息（由现代浏览器提供）
	}

	// 过滤掉空值并用特殊分隔符连接（与前端相同）
	identifierSource := strings.Join(filterEmpty(stableParams), "###")

	// 生成哈希和检验值，尽量与前端保持一致的算法
	hashValue := simpleHash(identifierSource)
	checksum := simpleChecksum(identifierSource)

	// 组合获得最终标识符
	combinedValue := fmt.Sprintf("%x%x", hashValue, checksum)
	if len(combinedValue) > 12 {
		return combinedValue[:12]
	}
	return combinedValue
}

// 过滤空字符串
func filterEmpty(strs []string) []string {
	var result []string
	for _, s := range strs {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

// 简单哈希函数，与前端JavaScript的哈希算法相似
func simpleHash(s string) uint32 {
	var total uint32 = 0
	for i := 0; i < len(s); i++ {
		// 使用相同的算法：total = total * 31 + char
		total = (total*31 + uint32(s[i])) & 0xFFFFFFFF
	}
	return total
}

// 简单校验和，与前端JavaScript相同的算法
func simpleChecksum(s string) uint32 {
	var sum uint32 = 0
	for i := 0; i < len(s); i += 5 {
		if i < len(s) {
			sum += uint32(s[i])
		}
	}
	return sum
}
