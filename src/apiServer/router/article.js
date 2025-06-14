import express from 'express'
import db from '../dataBase/index.js'

const router = express.Router()

// 文章获取接口----------------------------------------
// 获取文章列表
router.get('/list', async (req, res) => {
  try {
    const { 
      category = '', 
      page = 1, 
      limit = 10, 
      sortBy = 'createTime',
      sortOrder = 'DESC',
      status = 'published'
    } = req.query

    const offset = (page - 1) * limit
    
    // 构建查询条件
    let whereClause = 'WHERE status = ?'
    const params = [status]
    
    if (category && category !== 'comprehensive') {
      whereClause += ' AND category = ?'
      params.push(category)
    }
    
    // 获取文章列表
    const sql = `
      SELECT 
        articleId,
        title,
        summary,
        author,
        cover,
        category,
        tag,
        viewCount,
        likeCount,
        commentCount,
        status,
        createTime,
        updateTime
      FROM articles 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `
    
    params.push(parseInt(limit), parseInt(offset))
    const [articles] = await db.query(sql, params)
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM articles ${whereClause}`
    const [countResult] = await db.query(countSql, params.slice(0, -2))
    const total = countResult[0].total //.total 是 MySQL 查询结果中的字段名
    
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: articles,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取文章列表失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 获取推荐文章列表
router.get('/recommend', async (req, res) => {
  try {
    const { category = '', limit = 10 } = req.query
    
    let whereClause = 'WHERE status = ?'
    const params = ['published']
    
    if (category && category !== 'comprehensive') {
      whereClause += ' AND category = ?'
      params.push(category)
    }
    
    // 按浏览量和点赞数排序
    const sql = `
      SELECT 
        articleId,
        title,
        summary,
        author,
        cover,
        category,
        tag,
        viewCount,
        likeCount,
        commentCount,
        createTime
      FROM articles 
      ${whereClause}
      ORDER BY (viewCount * 0.7 + likeCount * 0.3) DESC, createTime DESC
      LIMIT ?
    `
    
    params.push(parseInt(limit))
    const [articles] = await db.query(sql, params)
    
    res.json({
      code: 200,
      message: '获取成功',
      data: articles
    })
  } catch (error) {
    console.error('获取推荐文章失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 获取最新文章列表
router.get('/latest', async (req, res) => {
  try {
    const { category = '', limit = 10 } = req.query
    
    let whereClause = 'WHERE status = ?'
    const params = ['published']
    
    if (category && category !== 'comprehensive') {
      whereClause += ' AND category = ?'
      params.push(category)
    }
    
    const sql = `
      SELECT 
        articleId,
        title,
        summary,
        author,
        cover,
        category,
        tag,
        viewCount,
        likeCount,
        commentCount,
        createTime
      FROM articles 
      ${whereClause}
      ORDER BY createTime DESC
      LIMIT ?
    `
    
    params.push(parseInt(limit))
    const [articles] = await db.query(sql, params)
    
    res.json({
      code: 200,
      message: '获取成功',
      data: articles
    })
  } catch (error) {
    console.error('获取最新文章失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 获取文章详情
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 获取文章详情
    const sql = `
      SELECT * FROM articles 
      WHERE articleId = ? AND status IN ('published', 'draft')
    `
    
    const [articles] = await db.query(sql, [id])
    
    if (articles.length === 0) {
      return res.json({
        code: 404,
        message: '文章不存在'
      })
    }
    
    // 增加浏览量
    await db.query(
      'UPDATE articles SET viewCount = viewCount + 1 WHERE articleId = ?',
      [id]
    )
    
    const article = articles[0]
    article.viewCount += 1
    
    res.json({
      code: 200,
      message: '获取成功',
      data: article
    })
  } catch (error) {
    console.error('获取文章详情失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 文章操作接口----------------------------------------
// 创建文章
router.post('/create', async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      author,
      cover = '',
      category,
      tag = '',
      status = 'draft'
    } = req.body
    
    // 验证必填字段
    if (!title || !content || !author || !category) {
      return res.json({
        code: 400,
        message: '标题、内容、作者和分类为必填字段'
      })
    }
    
    const sql = `
      INSERT INTO articles (
        title, content, summary, author, cover, 
        category, tag, status, createTime, updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `
    
    const [result] = await db.query(sql, [
      title, content, summary, author, cover, 
      category, tag, status
    ])
    
    res.json({
      code: 200,
      message: '创建成功',
      data: {
        articleId: result.insertId
      }
    })
  } catch (error) {
    console.error('创建文章失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 更新文章
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      content,
      summary,
      cover,
      category,
      tag,
      status
    } = req.body
    
    // 检查文章是否存在
    const [existingArticles] = await db.query(
      'SELECT articleId FROM articles WHERE articleId = ?',
      [id]
    )
    
    if (existingArticles.length === 0) {
      return res.json({
        code: 404,
        message: '文章不存在'
      })
    }
    
    // 构建更新字段
    const updateFields = []
    const params = []
    
    if (title !== undefined) {
      updateFields.push('title = ?')
      params.push(title)
    }
    if (content !== undefined) {
      updateFields.push('content = ?')
      params.push(content)
    }
    if (summary !== undefined) {
      updateFields.push('summary = ?')
      params.push(summary)
    }
    if (cover !== undefined) {
      updateFields.push('cover = ?')
      params.push(cover)
    }
    if (category !== undefined) {
      updateFields.push('category = ?')
      params.push(category)
    }
    if (tag !== undefined) {
      updateFields.push('tag = ?')
      params.push(tag)
    }
    if (status !== undefined) {
      updateFields.push('status = ?')
      params.push(status)
    }
    
    if (updateFields.length === 0) {
      return res.json({
        code: 400,
        message: '没有要更新的字段'
      })
    }
    
    updateFields.push('updateTime = NOW()')
    params.push(id)
    
    const sql = `
      UPDATE articles 
      SET ${updateFields.join(', ')}
      WHERE articleId = ?
    `
    
    await db.query(sql, params)
    
    res.json({
      code: 200,
      message: '更新成功'
    })
  } catch (error) {
    console.error('更新文章失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

// 删除文章（软删除）
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 检查文章是否存在
    const [existingArticles] = await db.query(
      'SELECT articleId FROM articles WHERE articleId = ?',
      [id]
    )
    
    if (existingArticles.length === 0) {
      return res.json({
        code: 404,
        message: '文章不存在'
      })
    }
    
    // 软删除（更新状态）
    const sql = `
      UPDATE articles 
      SET status = 'deleted', updateTime = NOW()
      WHERE articleId = ?
    `
    
    await db.query(sql, [id])
    
    res.json({
      code: 200,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除文章失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

export default router
