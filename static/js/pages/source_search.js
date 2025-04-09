// 来源搜索页面专用 JavaScript

// 存储当前页面状态
let isLoading = false;
let currentSourceId = '';
let searchTerm = '';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 设置搜索按钮事件监听
    document.getElementById('searchButton').addEventListener('click', function() {
        const sourceId = document.getElementById('sourceIdInput').value.trim();
        if (sourceId) {
            searchBySourceId(sourceId);
        } else {
            showToast('请输入来源ID');
        }
    });
    
    // 设置搜索输入框回车事件
    document.getElementById('sourceIdInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const sourceId = this.value.trim();
            if (sourceId) {
                searchBySourceId(sourceId);
            } else {
                showToast('请输入来源ID');
            }
        }
    });
    
    // 设置标题搜索按钮事件监听
    document.getElementById('titleSearchButton').addEventListener('click', function() {
        const titleSearchInput = document.getElementById('titleSearchInput');
        if (titleSearchInput) {
            const newSearchTerm = titleSearchInput.value.trim();
            if (newSearchTerm !== searchTerm) {
                searchTerm = newSearchTerm;
                filterContentByTitle();
            }
        }
    });
    
    // 设置标题搜索输入框回车事件
    const titleSearchInput = document.getElementById('titleSearchInput');
    if (titleSearchInput) {
        titleSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const newSearchTerm = this.value.trim();
                if (newSearchTerm !== searchTerm) {
                    searchTerm = newSearchTerm;
                    filterContentByTitle();
                }
            }
        });
    }
    
    // 检查URL参数，如果有source_id，直接执行搜索
    const urlParams = new URLSearchParams(window.location.search);
    const sourceId = urlParams.get('source_id');
    if (sourceId) {
        document.getElementById('sourceIdInput').value = sourceId;
        searchBySourceId(sourceId);
    }
});

// 根据来源ID搜索
function searchBySourceId(sourceId) {
    if (isLoading || sourceId === currentSourceId) {
        return;
    }
    
    // 更新当前搜索状态
    isLoading = true;
    currentSourceId = sourceId;
    searchTerm = '';
    
    // 重置搜索输入框
    const titleSearchInput = document.getElementById('titleSearchInput');
    if (titleSearchInput) {
        titleSearchInput.value = '';
    }
    
    // 显示加载中
    document.getElementById('loading').style.display = 'block';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('titleSearch').style.display = 'none';
    
    // 发送请求
    fetch(`/api/source-content?source=${encodeURIComponent(sourceId)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据失败');
            }
            return response.json();
        })
        .then(data => {
            // 更新加载状态
            isLoading = false;
            
            // 处理搜索结果
            displaySearchResults(data);
        })
        .catch(error => {
            // 更新加载状态
            isLoading = false;
            
            console.error('Error:', error);
            document.getElementById('loading').innerHTML = `
                <p>搜索失败: ${error.message}</p>
                <p>请稍后重试</p>
            `;
        });
}

// 显示搜索结果
function displaySearchResults(data) {
    // 隐藏加载中
    document.getElementById('loading').style.display = 'none';
    
    // 处理无结果情况
    if (data.total === 0 || !data.items || data.items.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        return;
    }
    
    // 有结果，显示结果容器
    const searchResults = document.getElementById('searchResults');
    searchResults.style.display = 'block';
    
    // 显示用户信息
    displayUserInfo({
        id: data.items[0]?.id || '未知ID',
        sourceId: data.source,
        registerTime: data.items[0]?.createTime || new Date().toISOString(),
        contentCount: data.total
    });
    
    // 显示内容列表
    displayContentList(data.items);
    
    // 显示标题搜索框
    document.getElementById('titleSearch').style.display = 'block';
    
    // 更新URL参数，方便分享
    updateURL(currentSourceId);
}

// 显示用户信息
function displayUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = '';
    
    const userCard = document.createElement('div');
    userCard.className = 'user-card';
    
    // 用户ID
    const userIdEl = document.createElement('div');
    userIdEl.className = 'user-id';
    userIdEl.innerHTML = `<strong>用户ID:</strong> <span>${user.id}</span>`;
    userCard.appendChild(userIdEl);
    
    // 来源ID
    const sourceIdEl = document.createElement('div');
    sourceIdEl.className = 'source-id';
    sourceIdEl.innerHTML = `<strong>来源ID:</strong> <span>${user.sourceId}</span>`;
    userCard.appendChild(sourceIdEl);
    
    // 注册时间
    const registerTimeEl = document.createElement('div');
    registerTimeEl.className = 'register-time';
    const registerDate = new Date(user.registerTime);
    registerTimeEl.innerHTML = `<strong>注册时间:</strong> <span>${registerDate.toLocaleString('zh-CN')}</span>`;
    userCard.appendChild(registerTimeEl);
    
    // 内容统计
    const statsEl = document.createElement('div');
    statsEl.className = 'content-stats';
    statsEl.innerHTML = `<strong>内容数量:</strong> <span id="content-count">${user.contentCount}</span>`;
    userCard.appendChild(statsEl);
    
    userInfo.appendChild(userCard);
}

// 显示内容列表
function displayContentList(contents) {
    const contentList = document.getElementById('contentList');
    contentList.innerHTML = '';
    
    // 添加所有内容项
    contents.forEach(item => {
        const contentItem = createContentItem(item);
        contentList.appendChild(contentItem);
    });
    
    // 更新内容计数
    document.getElementById('content-count').textContent = contents.length;
}

// 创建内容项元素
function createContentItem(item) {
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item';
    contentItem.setAttribute('data-title', item.title || '');
    
    // 创建头部信息
    const header = document.createElement('div');
    header.className = 'content-header';
    
    // 内容类型标签
    const typeSpan = document.createElement('span');
    let typeClass = 'type-text';
    let typeText = '文本内容';
    let typeIcon = '<i class="fas fa-file-alt"></i>';
    
    if (item.type === 'markdown') {
        typeClass = 'type-markdown';
        typeText = 'Markdown';
        typeIcon = '<i class="fab fa-markdown"></i>';
    } else if (item.type === 'image') {
        typeClass = 'type-image';
        typeText = '图片内容';
        typeIcon = '<i class="fas fa-image"></i>';
    }
    
    typeSpan.className = `content-type ${typeClass}`;
    typeSpan.innerHTML = `${typeIcon} ${typeText}`;
    header.appendChild(typeSpan);
    
    // 内容标题
    const titleEl = document.createElement('h3');
    titleEl.className = 'content-title';
    titleEl.textContent = item.title || '无标题';
    
    // 添加内容链接
    const contentLink = document.createElement('a');
    contentLink.href = item.link || ('/' + item.short_id);
    contentLink.className = 'content-link';
    contentLink.appendChild(titleEl);
    
    // 时间信息
    const timeInfo = document.createElement('div');
    timeInfo.className = 'time-info';
    const createDate = new Date(item.createTime);
    timeInfo.innerHTML = `<i class="far fa-clock"></i> ${createDate.toLocaleString('zh-CN')}`;
    
    // 将元素添加到内容项
    contentItem.appendChild(header);
    contentItem.appendChild(contentLink);
    contentItem.appendChild(timeInfo);
    
    return contentItem;
}

// 根据标题筛选内容
function filterContentByTitle() {
    const contentItems = document.querySelectorAll('#contentList .content-item');
    let visibleCount = 0;
    
    contentItems.forEach(item => {
        const title = item.getAttribute('data-title').toLowerCase();
        if (!searchTerm || title.includes(searchTerm.toLowerCase())) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // 更新显示的内容计数
    document.getElementById('content-count').textContent = visibleCount;
    
    // 处理无匹配结果的情况
    if (visibleCount === 0 && searchTerm) {
        showToast(`没有找到包含 "${searchTerm}" 的内容`);
    }
}

// 更新URL参数
function updateURL(sourceId) {
    const url = new URL(window.location);
    url.searchParams.set('source_id', sourceId);
    window.history.replaceState({}, '', url);
} 