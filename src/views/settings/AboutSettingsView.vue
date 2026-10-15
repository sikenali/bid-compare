<script setup lang="ts">
const currentYear = new Date().getFullYear()
const appVersion = 'V1.0.0'
</script>

<template>
  <div class="about-view">
    <div class="page-header-card">
      <div class="header-content">
        <div class="header-info">
          <div class="breadcrumb">
            <span>首页</span><span class="sep">/</span>
            <span>设置中心</span><span class="sep">/</span>
            <span class="current">关于</span>
          </div>
          <div class="header-title">
            <h1>关于</h1>
            <p>版本信息、开源仓库与版权声明</p>
          </div>
        </div>
      </div>
    </div>

    <div class="about-card">
      <div class="about-badge">
        <RiTargetLine class="badge-logo" />
      </div>
      <div class="about-name">文比猩 · 文档智能对比平台</div>
      <div class="about-slogan">智能化文档对比与查重工具</div>
      <div class="about-version">版本: {{ appVersion }}</div>
      <a class="about-repo" href="https://github.com/sikenali/bid-compare" target="_blank" rel="noopener noreferrer" title="访问 GitHub 仓库">
        <RiGithubLine class="icon" />
      </a>
      <div class="about-copy">© {{ currentYear }} 文比猩 · sikenali</div>
    </div>
  </div>
</template>

<style scoped>
.about-view { display: flex; flex-direction: column; gap: 20px; }

.page-header-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; padding: 20px 24px;
}
.header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.header-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.breadcrumb span { color: var(--color-text-faint, #A7A296); }
.breadcrumb span.current { color: var(--color-text-body, #3A3A3A); font-weight: 500; }
.header-title h1 { font-size: 30px; font-weight: 700; color: var(--color-text-primary, #1F1D1A); margin: 12px 0 0; letter-spacing: -0.5px; line-height: 1.2; }
.header-title p { font-size: 15px; color: var(--color-text-secondary, #6E6A60); margin: 8px 0 0; }

.about-card {
  background: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border-soft, #EDE9E0);
  border-radius: 16px; height: 400px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.about-badge {
  width: 118px; height: 118px; border-radius: 50%;
  border: 0.7px solid var(--color-border, #E5DFD3);
  background: var(--color-primary-soft, #FBE9E7);
  display: flex; align-items: center; justify-content: center;
}
.badge-logo { font-size: 52px; color: #BE3B2E; }
.about-name {
  margin-top: 32px; font-size: 24px; font-weight: 700;
  color: var(--color-text-primary, #1F1D1A); line-height: 1.2;
}
.about-slogan { margin-top: 16px; font-size: 16px; color: var(--color-text-secondary, #6E6A60); line-height: 1.4; }
.about-version { margin-top: 8px; font-size: 14px; color: var(--color-text-muted, #8A8578); }
.about-repo {
  margin-top: 32px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; text-decoration: none; color: inherit;
}
.about-repo:hover { opacity: 0.75; }
.about-repo .icon { font-size: 34px; color: var(--color-text-secondary, #6E6A60); }
.about-copy { margin-top: 32px; font-size: 14px; color: var(--color-text-faint, #A7A296); }
</style>
