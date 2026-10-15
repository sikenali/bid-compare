<template>
  <footer class="page-footer">
    <!-- 左侧：logo + 文字 -->
    <div class="footer-brand">
      <RiTargetLine class="tool-logo" />
      <span class="footer-brand-text">回旋标工具系列</span>
    </div>

    <!-- 居中：2 个图标 -->
    <div class="footer-actions">
      <div class="footer-icon-btn" title="企业信用" @click="$emit('credit-query')">
        <RiShieldCheckLine class="footer-mark" />
      </div>
      <div class="footer-icon-btn" title="招标网站" @click="$emit('bidding-sites')">
        <RiLinksLine class="footer-mark" />
      </div>
    </div>

    <!-- 右侧：版权 -->
    <span class="footer-copy">© {{ year }} {{ BRAND_NAME }} Powered by <a href="https://lazycat.cloud" target="_blank" rel="noopener noreferrer" class="footer-link">LightOS</a></span>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RiTargetLine, RiShieldCheckLine, RiLinksLine } from '@remixicon/vue';
import { BRAND_NAME } from '../../constants/brand';

defineEmits(['credit-query', 'bidding-sites'])

const year = ref(new Date().getFullYear())
onMounted(() => { year.value = new Date().getFullYear() })
</script>

<style scoped>
.page-footer {
  height: 58px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: linear-gradient(180deg, var(--color-bg-white, #FFFFFF) 0%, var(--color-bg-secondary, #F7F3EA) 100%);
  border-top: 1px solid var(--color-border-soft, #EDE9E0);
}

/* 左侧 logo + 文字 */
.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tool-logo {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
  flex-shrink: 0;
}
.footer-brand-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-body, var(--color-brown, #3A3A3A));
  font-family: var(--font-ui);
  white-space: nowrap;
}

/* 居中图标组 */
.footer-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.footer-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-bg-white, #FFFFFF);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary, var(--color-brown-muted, #6E6A60));
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
.footer-icon-btn:hover {
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary, var(--color-cinnabar, #C0392B)) 30%, transparent);
}
.footer-mark {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  font-size: 14px;
  color: inherit;
  transition: transform 0.25s ease;
}

/* 右侧版权 */
.footer-copy {
  font-size: 14px;
  color: var(--color-text-muted, var(--color-brown-muted, #8A8578));
  white-space: nowrap;
  font-family: var(--font-ui);
}
.footer-link {
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
  text-decoration: none;
  transition: opacity 0.2s;
}
.footer-link:hover {
  opacity: 0.75;
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
    height: 44px;
  }
  .footer-copy {
    font-size: 11px;
  }
}
</style>
