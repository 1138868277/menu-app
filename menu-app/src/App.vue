<template>
  <div class="app">
    <!-- 背景 -->
    <div class="bg-orb bg-orb-1"></div>
    <div class="bg-orb bg-orb-2"></div>

    <!-- 顶部 -->
    <div class="header">
      <div class="header-accent"></div>
      <div class="title-wrapper">
        <span class="deco deco-1">✦</span>
        <span class="deco deco-2">·</span>
        <span class="deco deco-3">✦</span>
        <span class="deco deco-4">·</span>
        <span class="deco deco-5">✦</span>
        <h1 class="store-name">{{ menu.store.name }}</h1>
        <span class="deco deco-6">✦</span>
        <span class="deco deco-7">·</span>
        <span class="deco deco-8">✦</span>
        <span class="deco deco-9">·</span>
        <span class="deco deco-10">✦</span>
      </div>
      <p class="store-desc">{{ menu.store.description }}</p>
      <div v-if="menu.store.notice" class="store-notice">{{ menu.store.notice }}</div>
    </div>

    <!-- 分类导航 -->
    <div class="category-nav">
      <button
        v-for="(cat, i) in menu.categories"
        :key="i"
        :class="['category-tab', { active: activeIndex === i }]"
        @click="activeIndex = i"
      >
        <span class="tab-emoji">{{ cat.emoji }}</span>
        <span>{{ cat.name }}</span>
      </button>
    </div>

    <!-- 菜品列表 -->
    <div class="dish-list" v-if="currentCategory">
      <div
        v-for="(dish, i) in currentCategory.dishes"
        :key="i"
        :ref="el => { if (el) dishRefs[i] = el }"
        class="dish-card"
      >
        <div class="dish-image-wrapper">
          <img v-if="dish.image" :src="dish.image" :alt="dish.name" class="dish-image" @click="previewImage = dish.image" />
          <div v-else class="dish-image-placeholder">
            <span>{{ currentCategory.emoji }}</span>
          </div>
        </div>
        <div class="dish-info">
          <div>
            <div class="dish-name">{{ dish.name }}</div>
            <div class="dish-tags" v-if="dish.tags.length">
              <span v-for="(tag, j) in dish.tags" :key="j" class="dish-tag">{{ tag }}</span>
            </div>
            <div class="dish-description" v-if="dish.description">{{ dish.description }}</div>
          </div>
          <div class="dish-bottom">
            <span class="dish-price">¥{{ dish.price }}<span class="dish-unit">/{{ dish.unit }}</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="currentCategory && currentCategory.dishes.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">暂无菜品</div>
    </div>

    <!-- 底部 -->
    <div class="footer">
      <span class="footer-text">仅展示 · 不支持下单</span>
    </div>

    <!-- 图片预览 -->
    <div v-if="previewImage" class="image-overlay" @click="previewImage = ''">
      <div class="overlay-bg"></div>
      <img :src="previewImage" alt="菜品预览" class="preview-img" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import menuData from './data/menu.json'

const menu = ref(menuData)
const activeIndex = ref(0)
const previewImage = ref('')
const dishRefs = ref({})

const currentCategory = computed(() => {
  return menu.value.categories[activeIndex.value]
})

watch(activeIndex, () => {
  window.scrollTo({ top: 160, behavior: 'smooth' })
  dishRefs.value = {}
})

watch(currentCategory, async () => {
  await nextTick()
  setTimeout(() => {
    Object.values(dishRefs.value).forEach((el, i) => {
      if (el && el.style) {
        el.style.opacity = '0'
        el.style.transform = 'translateY(20px)'
        setTimeout(() => {
          el.style.transition = 'all 0.4s ease-out'
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }, i * 60)
      }
    })
  }, 50)
}, { immediate: true })
</script>
