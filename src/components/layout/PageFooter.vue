<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RiExchangeLine, RiGithubLine } from '@remixicon/vue'

const year = ref(new Date().getFullYear())
onMounted(() => { year.value = new Date().getFullYear() })
</script>

<template>
  <footer class="page-footer">
    <div class="footer-brand">
      <RiExchangeLine class="footer-logo" />
      <span class="footer-brand-text">文比猩工具系列</span>
    </div>

    <div class="footer-actions">
      <a href="https://github.com/lazycat-ai/bid-compare" target="_blank" rel="noopener noreferrer" class="footer-link-btn" title="开源仓库">
        <RiGithubLine class="footer-icon" />
      </a>
    </div>

    <span class="footer-copy">© {{ year }} 文比猩 Powered by <a href="https://lazycat.cloud" target="_blank" rel="noopener noreferrer" class="footer-link">LightOS</a></span>
  </footer>
</template>

<style scoped>
.page-footer {
  height: 48px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-dark) 100%);
  border-top: 0.7px solid var(--color-tan-border);
  flex-shrink: 0;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-logo {
  font-size: 18px;
  line-height: 1;
  color: var(--color-cinnabar);
  flex-shrink: 0;
}

.footer-brand-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-brown);
  font-family: var(--font-ui);
  white-space: nowrap;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-link-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-cream-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brown-muted);
  transition: all 0.2s;
  text-decoration: none;
}

.footer-link-btn:hover {
  background: var(--color-cinnabar);
  color: #fff;
  transform: translateY(-1px);
}

.footer-icon {
  font-size: 14px;
  color: inherit;
}

.footer-copy {
  font-size: 12px;
  color: var(--color-brown-muted);
  white-space: nowrap;
  font-family: var(--font-ui);
}

.footer-link {
  color: var(--color-cinnabar);
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .page-footer {
    padding: 0 16px;
    gap: 12px;
  }

  .footer-brand-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .page-footer {
    padding: 0 10px;
    height: 40px;
  }

  .footer-copy {
    font-size: 11px;
  }
}
</style>
