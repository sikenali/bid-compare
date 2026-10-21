<script setup lang="ts">
</script>

<template>
  <div class="skill-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span>设置中心</span><span class="sep">/</span>
            <span class="current">技能管理</span>
          </div>
          <div class="header-title">
            <h1>技能管理</h1>
            <p>配置智能对比与提取技能</p>
          </div>
        </div>
      </div>
    </div>
    <div class="section-card">
      <div class="card-title">技能列表</div>
      <p class="empty-text">暂无技能配置</p>
    </div>
  </div>
</template>

<style scoped>
.skill-view { display: flex; flex-direction: column; gap: 20px; }
.page-header-card { background: var(--color-bg-white, #fff); border: 0.7px solid var(--color-border-soft, #EDE9E0); border-radius: 16px; padding: 20px 24px; }
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.header-info { flex: 1; }
.breadcrumb { display: flex; gap: 8px; font-size: 14px; font-family: "SourceHanSans-Regular", var(--font-family-cn); }
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); margin: 12px 0 0; letter-spacing: -0.5px; font-family: "SourceHanSans-Bold", var(--font-family-cn); line-height: 1.2; }
.header-title p { font-size: 15px; color: var(--color-text-secondary, #6E6A60); margin: 8px 0 0; font-family: "SourceHanSans-Regular", var(--font-family-cn); }
.section-card { background: var(--color-bg-white, #fff); border: 0.7px solid var(--color-border-soft, #EDE9E0); border-radius: 16px; padding: 24px 40px; }
.card-title { font-size: 17px; font-weight: 500; color: var(--color-text-primary, #1F1D1A); margin-bottom: 16px; font-family: "SourceHanSans-Medium", var(--font-family-cn); }
.empty-text { color: var(--color-text-muted, #8A8578); font-size: 14px; }
</style>
