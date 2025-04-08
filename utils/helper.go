package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
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

// SaveUploadedImage 保存上传的图片并返回唯一的文件路径
// 如果发现相同内容的文件已存在，则直接返回已存在的文件路径
func SaveUploadedImage(file io.Reader, originalFilename string) (string, error) {
	// 获取MD5存储实例
	md5Store := GetFileMD5Store()

	// 确保上传目录存在
	if _, err := os.Stat(UploadsDir); os.IsNotExist(err) {
		if err := os.MkdirAll(UploadsDir, 0755); err != nil {
			return "", fmt.Errorf("创建上传目录失败: %v", err)
		}
	}

	// 计算文件内容的MD5
	tempFile, err := os.CreateTemp("", "upload-*")
	if err != nil {
		return "", fmt.Errorf("创建临时文件失败: %v", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// 将上传内容写入临时文件，同时计算MD5
	hash := md5.New()
	multiWriter := io.MultiWriter(tempFile, hash)

	if _, err := io.Copy(multiWriter, file); err != nil {
		return "", fmt.Errorf("复制文件内容失败: %v", err)
	}

	// 获取文件MD5和扩展名
	contentMD5 := hex.EncodeToString(hash.Sum(nil))
	fileExt := filepath.Ext(originalFilename)
	if fileExt == "" {
		// 如果没有扩展名，默认为.jpg
		fileExt = ".jpg"
	}

	// 检查是否已存在相同MD5的文件
	existingFile, found := md5Store.Get(contentMD5)
	if found {
		// 验证文件是否真的存在
		if _, err := os.Stat(existingFile); err == nil {
			log.Printf("找到重复文件: %s (MD5: %s)", existingFile, contentMD5)
			return existingFile, nil
		}
		// 如果文件不存在，从索引中删除并继续处理
		md5Store.Delete(contentMD5)
		log.Printf("从MD5索引中删除不存在的文件: %s", contentMD5)
	}

	// 生成唯一文件名：当前时间戳_内容MD5哈希_原始文件名的一部分
	timestamp := time.Now().UnixNano() / 1000000 // 毫秒时间戳
	baseFilename := filepath.Base(originalFilename)
	if len(baseFilename) > 20 {
		baseFilename = baseFilename[:20] // 限制原始文件名长度
	}
	safeFilename := strings.ReplaceAll(baseFilename, " ", "_") // 替换空格为下划线
	uniqueFilename := fmt.Sprintf("%d_%s_%s%s", timestamp, contentMD5[:8], safeFilename, fileExt)
	targetPath := filepath.Join(UploadsDir, uniqueFilename)

	// 将临时文件内容移到目标位置
	// 首先需要重置临时文件的读取位置
	if _, err := tempFile.Seek(0, 0); err != nil {
		return "", fmt.Errorf("重置临时文件位置失败: %v", err)
	}

	targetFile, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("创建目标文件失败: %v", err)
	}
	defer targetFile.Close()

	if _, err := io.Copy(targetFile, tempFile); err != nil {
		return "", fmt.Errorf("复制到目标文件失败: %v", err)
	}

	// 存储文件MD5到索引
	md5Store.Set(contentMD5, targetPath)
	log.Printf("添加文件到MD5索引: %s -> %s", contentMD5, targetPath)

	return targetPath, nil
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
