// main.js

let helpButtonClickCount = 0;

function toggleHelp() {
    const helpContent = document.getElementById('helpContent');
    helpButtonClickCount++; // 增加按钮点击次数
    if (helpButtonClickCount >= 10) { // 如果点击次数达到10次
        helpButtonClickCount = 0; // 重置点击次数
        alert("王家骥：南京大学法律硕士  中国政法大学法学学士  日语翻译  摄影师  资深学术混子  程序员学徒  德语初心者  黄金圆脸  抽象法学创始人  小红书新晋网红  明日香爱好者  动森岛主  法学电子书仓鼠  ");
    } else {
        helpContent.style.display = helpContent.style.display === 'none' ? 'block' : 'none'; // 切换显示状态
    }
}

function openReferenceTool() {
        window.open('https://pegaseius.github.io/lawschoolreferencetest/', '_blank');// 跳转一键排序
    }

function convertCitation(inputCitation) {
    // 使用十个正则表达式匹配论文引用的不同部分
    const regexWithPages = /^(.+?)\.(.+?)\[(.+?)\]\.(.+?),(\d{4})\((\d{2})\):(\d+)-(\d+)\.$/;
    const regexWith1Page = /^(.+?)\.(.+?)\[(.+?)\]\.(.+?),(\d{4})\((\d{2})\):(\d+)\.$/;
    const regexWithoutPages = /^(.+?)\.(.+?)\[(.+?)\]\.(.+?),(\d{4})\((\d{2})\)\.$/;
    const regexzhiwangqikan = /^(.*?)\[(.*?)\]\.(.*?)\.(.*?)\,(.*?)\((.*?)\)/;
    const regexPublisher = /^(.+?)\.(.+?)\[M\]\.([^:,]+):([^,]+),(\d{4})\.$/;
    const regexPublisherwithpages = /^(.+?)\.(.+?)\[M\]\.(.+?):(.+?),(\d+):(\d+)-(\d+)\.$/;
    const regexPublisherwith1page = /^(.+?)\.(.+?)\[(M)\]\.(.+?):(.+?),(\d+):(\d+)\.$/;
    const regexzhiwangbookz = /^(.*?)\[(.*?)\]\.(.*?)(著)\.(.*?)\.(.*)/;
    const regexzhiwangbookzb = /^(.*?)\[(.*?)\]\.(.*?)(主编)\.(.*?)\.(.*)/;
    const regexzhiwangbook = /^(.*?)\[(.*?)\]\.(.*?)\.(.*?)\.(.*)/;
    const regexDegree = /^(.+?)\.(.+?)\[(D)\]\.(.+?):(.+?),(\d+)\.$/;
    const regexDegreewithpages = /^(.+?)\.(.+?)\[(D)\]\.(.+?):(.+?),(\d+):(\d+)-(\d+)\.$/;
    const regexDegreewith1page = /^(.+?)\.(.+?)\[(D)\]\.(.+?):(.+?),(\d+):(\d+)\.$/;
    const regexzhiwangdegree = /^(.+?)\[(\w)\]\.\s*(.+?)\.(.+?),(\d+)$/;

    // 逐个尝试匹配
    let match;

    match = inputCitation.match(regexWithPages);
    if (match) {
        const period = parseInt(match[6], 10); // 转换期号为整数以去除前导零
        return `${match[1]}：《${match[2]}》，载《${match[4]}》${match[5]}年第${period}期，第${match[7]}-${match[8]}页。`;
    }

    match = inputCitation.match(regexWith1Page);
    if (match) {
        const period = parseInt(match[6], 10); // 转换期号为整数以去除前导零
        return `${match[1]}：《${match[2]}》，载《${match[4]}》${match[5]}年第${period}期，第${match[7]}页。`;
    }

    match = inputCitation.match(regexWithoutPages);
    if (match) {
        const period = parseInt(match[6], 10); // 转换期号为整数以去除前导零
        return `${match[1]}：《${match[2]}》，载《${match[4]}》${match[5]}年第${period}期。`;
    }

    match = inputCitation.match(regexzhiwangqikan);
    if (match) {
    	const period = parseInt(match[6], 10); // 转换期号为整数以去除前导零
        return `${match[3]}：《${match[1]}》，载《${match[4]}》${match[5]}年第${period}期。`;
    }

    match = inputCitation.match(regexPublisher);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[4]}${match[5]}年版。`;
    }
    
    match = inputCitation.match(regexPublisherwithpages);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[4]}${match[5]}年版，第${match[6]}-${match[7]}页。`;
    }

    match = inputCitation.match(regexPublisherwith1page);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[5]}${match[6]}年版，第${match[7]}页。`;
    }

    match = inputCitation.match(regexzhiwangbookz);
    if (match) {
        return `${match[3]}：《${match[1]}》，${match[5]}${match[6]}年版。`;
    }

    match = inputCitation.match(regexzhiwangbookzb);
    if (match) {
        return `${match[3]}：《${match[1]}》，${match[5]}${match[6]}年版。`;
    }

    match = inputCitation.match(regexzhiwangbook);
    if (match) {
        return `${match[3]}：《${match[1]}》，${match[4]}${match[5]}年版。`;
    }

    match = inputCitation.match(regexDegree);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[5]}${match[6]}年博士论文。`;
    }
    
    match = inputCitation.match(regexDegreewithpages);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[5]}${match[6]}年博士论文,第${match[7]}-${match[8]}页。`;
    }
    
    match = inputCitation.match(regexDegreewith1page);
    if (match) {
        return `${match[1]}：《${match[2]}》，${match[5]}${match[6]}年博士论文,第${match[7]}页。`;
    }
    
    match = inputCitation.match(regexzhiwangdegree);
    if (match) {
        return `${match[3]}：《${match[1]}》，${match[4]}${match[5]}年博士论文。`;
    }

    // 如果都匹配不到，返回错误信息
    return "无法识别的引用格式";
}

function convertAndDisplay() {
    const inputCitations = document.getElementById('inputCitations').value;
    const inputCitationArray = inputCitations.split('\n'); // 将输入的文献按行分割成数组
    let outputCitations = ''; // 初始化输出的引用文本

    // 遍历每个文献，转换并拼接到输出文本中
    inputCitationArray.forEach(inputCitation => {
        const outputCitation = convertCitation(inputCitation.trim().replace(/;/g, '、')); // 转换引用格式，并去除首尾空格，将分号替换为中文逗号
        outputCitations += outputCitation + '\n'; // 将转换后的引用文本拼接到输出文本中
    });

    document.getElementById('outputCitations').textContent = outputCitations.trim(); // 将输出文本显示在页面上
}

function copyToClipboard() {
    const outputCitations = document.getElementById('outputCitations').textContent;
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = outputCitations;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    alert('已复制到剪贴板');
}
