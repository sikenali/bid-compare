#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成两个 Word 文件 (1.docx 和 2.docx)
- 每个文件约 10000 字
- 段落大小随机
- 包含 20 处相同的 8 字符文本片段（随机分配位置）
"""

import random
import os
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

# 随机中文字符池
def random_chinese_text(length):
    """生成随机中文文本"""
    chars = "的一了是我不在人们有来他这上着个地到大里说就去子得也和那要下看天时过出小么起你都把好还多没为又可家学只以主会样年想生同老中十从自面前头道它后然走很像见两用她国动进成回什边作对开而己些现山民候经发工向事命给长水几义三声于高手知理眼志点心战二问但身方实吃做叫当住听革打呢真全才四已所敌之最光产情路分总条白话东席次亲如被花口放儿常气五第使写军吧文运再果怎定许快明行因别飞外树物活部门无往船望新带队先力完却站代员机更九您每风级跟笑啊孩万少直意夜比阶连车重便斗马哪化太指变社似士者干石满日决百原拿群究各六本思解立河村八难早论吗根共让相研今其书坐接应关信觉步反处记将千找争领或师结块跑谁草越字加脚紧爱等习阵怕月青半火法题建赶位唱海七女任件感准张团屋离色脸片科倒睛利世刚且由送切星导晚表够整认响雪流未场该并底深刻平伟忙提确近亮轻讲农古黑告界拉名呀土清阳照办史改历转画造嘴此治北必服雨穿内识验传业菜爬睡兴形量咱观苦体众通冲合破友度术饭公旁房极南枪读沙岁线野坚空收算至政城劳落钱特围弟胜教热展包歌类渐强数乡呼性音答哥际旧神座章帮啦受系令跳非何牛取入岸敢掉忽种装顶急林停息句区衣般报叶压慢叔背"
    return ''.join(random.choice(chars) for _ in range(length))

def generate_common_segments(count=20, length=8):
    """生成指定数量的相同文本片段"""
    segments = []
    chars = "的一了是我不在人们有来他这上着个地到大里说就去子得也和那要下看天时过出小么起你都把好还多没为又可家学只以主会样年想生同老中十从自面前头道它后然走很像见两用她国动进成回什边作对开而己些现山民候经发工向事命给长水几义三声于高手知理眼志点心战二问但身方实吃做叫当住听革打呢真全才四已所敌之最光产情路分总条白话东席次亲如被花口放儿常气五第使写军吧文运再果怎定许快明行因别飞外树物活部门无往船望新带队先力完却站代员机更九您每风级跟笑啊孩万少直意夜比阶连车重便斗马哪化太指变社似士者干石满日决百原拿群究各六本思解立河村八难早论吗根共让相研今其书坐接应关信觉步反处记将千找争领或师结块跑谁草越字加脚紧爱等习阵怕月青半火法题建赶位唱海七女任件感准张团屋离色脸片科倒睛利世刚且由送切星导晚表够整认响雪流未场该并底深刻平伟忙提确近亮轻讲农古黑告界拉名呀土清阳照办史改历转画造嘴此治北必服雨穿内识验传业菜爬睡兴形量咱观苦体众通冲合破友度术饭公旁房极南枪读沙岁线野坚空收算至政城劳落钱特围弟胜教热展包歌类渐强数乡呼性音答哥际旧神座章帮啦受系令跳非何牛取入岸敢掉忽种装顶急林停息句区衣般报叶压慢叔背"
    
    for _ in range(count):
        segment = ''.join(random.choice(chars) for _ in range(length))
        segments.append(segment)
    
    return segments

def insert_segments_into_text(text, segments, positions):
    """在指定位置插入片段"""
    result = list(text)
    # 按位置倒序插入，避免影响后续位置
    for seg, pos in sorted(zip(segments, positions), key=lambda x: x[1], reverse=True):
        if pos <= len(result):
            result.insert(pos, seg)
    return ''.join(result)

def generate_document(filename, total_chars, common_segments, doc_index):
    """生成 Word 文档"""
    doc = Document()
    
    # 设置默认字体
    style = doc.styles['Normal']
    font = style.font
    font.name = '宋体'
    font.size = Pt(12)
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.space_before = Pt(0)
    
    # 生成基础文本
    base_text = random_chinese_text(total_chars)
    
    # 为当前文档随机选择 20 个片段（可能与其他文档有重叠或不同）
    # doc_index 为 0 或 1，使用不同的随机种子确保片段分配不同
    random.seed(42 + doc_index * 1000)
    
    # 随机生成 20 个位置
    positions = []
    used_positions = set()
    
    for _ in range(20):
        while True:
            pos = random.randint(0, total_chars - 20)
            # 确保位置不重叠
            if all(abs(pos - p) > 15 for p in used_positions):
                positions.append(pos)
                used_positions.add(pos)
                break
    
    # 插入片段到文本中
    modified_text = insert_segments_into_text(base_text, common_segments, positions)
    
    # 将文本分成段落（段落长度随机）
    paragraphs = []
    current_pos = 0
    text_len = len(modified_text)
    
    while current_pos < text_len:
        # 随机段落长度 50-300 字
        para_len = random.randint(50, 300)
        para_end = min(current_pos + para_len, text_len)
        
        # 查找最近的标点符号作为段落结尾
        para_text = modified_text[current_pos:para_end]
        
        # 尝试在标点处断开
        punctuations = '，。！？、；：'
        last_punct = -1
        for i in range(len(para_text) - 1, -1, -1):
            if para_text[i] in punctuations:
                last_punct = i
                break
        
        if last_punct > len(para_text) * 0.5:  # 如果标点在后半段
            para_text = para_text[:last_punct + 1]
            current_pos += last_punct + 1
        else:
            current_pos = para_end
        
        paragraphs.append(para_text)
    
    # 写入文档
    for para_text in paragraphs:
        p = doc.add_paragraph()
        run = p.add_run(para_text)
        run.font.size = Pt(12)
        run.font.name = '宋体'
    
    # 保存文档
    doc.save(filename)
    print(f"已生成 {filename}")
    print(f"  - 总字数：{len(modified_text)}")
    print(f"  - 段落数：{len(paragraphs)}")
    print(f"  - 插入片段数：20")

def main():
    # 重置随机种子
    random.seed(42)
    
    # 生成 20 个相同的 8 字符片段
    common_segments = generate_common_segments(count=20, length=8)
    
    print("生成的 20 个相同片段：")
    for i, seg in enumerate(common_segments):
        print(f"  {i+1}. {seg}")
    print()
    
    # 生成两个文档
    generate_document("1.docx", 10000, common_segments, 0)
    generate_document("2.docx", 10000, common_segments, 1)
    
    print("\n完成！已生成 1.docx 和 2.docx")

if __name__ == "__main__":
    main()
