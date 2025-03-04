let vttContent = [];
let selectedBlocks = [];
let usedTags = new Set();

document.getElementById('dropZone').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.getElementById('dropZone').addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => processVTT(e.target.result);
        reader.readAsText(file);
    }
});

function processVTT(content) {
    const lines = content.split('\n');
    let currentBlock = null;
    vttContent = [];
    let yamlContent = '';
    let isInYaml = false;

    for (let line of lines) {
        if (line.trim() === '---') {
            if (!isInYaml) {
                isInYaml = true;
                yamlContent += line + '\n';
            } else {
                isInYaml = false;
                yamlContent += line + '\n';
                break;
            }
        } else if (isInYaml) {
            yamlContent += line + '\n';
        } else if (line.includes('-->')) {
            if (currentBlock) vttContent.push(currentBlock);
            currentBlock = { timestamp: line, tags: '', text: '' };
        } else if (currentBlock) {
            if (line.startsWith('#')) {
                currentBlock.tags += line + ' ';
            } else {
                currentBlock.text += line + '\n';
            }
        }
    }
    if (currentBlock) vttContent.push(currentBlock);

    displayVTT();
    addYAMLHeader(yamlContent);
}

function displayVTT() {
    const container = document.getElementById('vttContent');
    container.innerHTML = '';
    vttContent.forEach((block, index) => {
        const div = document.createElement('div');
        div.className = 'vtt-block';
        div.innerHTML = `
            <p>${block.timestamp}</p>
            <p class="tags" contenteditable="true">${block.tags}</p>
            <p class="editable" contenteditable="true">${block.text}</p>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('editable') && !e.target.classList.contains('tags')) {
                toggleBlockSelection(index);
            }
        });
        div.addEventListener('input', () => updateVTTContent(index, div));
        container.appendChild(div);
    });
}

function updateVTTContent(index, div) {
    vttContent[index].tags = div.querySelector('.tags').textContent;
    vttContent[index].text = div.querySelector('.editable').textContent;
}

function toggleBlockSelection(index) {
    const block = document.getElementsByClassName('vtt-block')[index];
    block.classList.toggle('selected');
    if (block.classList.contains('selected')) {
        selectedBlocks.push(index);
    } else {
        selectedBlocks = selectedBlocks.filter(i => i !== index);
    }
    selectedBlocks.sort((a, b) => a - b);
    updateMergeButtonVisibility();
}

function updateMergeButtonVisibility() {
    const mergeButton = document.getElementById('mergeButton');
    if (selectedBlocks.length > 1 && areBlocksAdjacent()) {
        mergeButton.style.display = 'block';
    } else {
        mergeButton.style.display = 'none';
    }
}

function areBlocksAdjacent() {
    for (let i = 1; i < selectedBlocks.length; i++) {
        if (selectedBlocks[i] !== selectedBlocks[i-1] + 1) {
            return false;
        }
    }
    return true;
}

document.getElementById('mergeButton').addEventListener('click', mergeSelectedBlocks);

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => processVTT(e.target.result);
        reader.readAsText(file);
    }
});

function mergeSelectedBlocks() {
    if (selectedBlocks.length < 2) return;

    const startBlock = vttContent[selectedBlocks[0]];
    const endBlock = vttContent[selectedBlocks[selectedBlocks.length - 1]];
    const mergedTimestamp = startBlock.timestamp.split(' --> ')[0] + ' --> ' + endBlock.timestamp.split(' --> ')[1];
    
    let mergedTags = startBlock.tags;
    let mergedText = startBlock.text.trim() + ' ';
    for (let i = 1; i < selectedBlocks.length; i++) {
        mergedTags += vttContent[selectedBlocks[i]].tags;
        mergedText += vttContent[selectedBlocks[i]].text.replace(/\[.*?\]:\s*/g, '').trim() + ' ';
    }
    mergedText = mergedText.trim();

    vttContent[selectedBlocks[0]] = { timestamp: mergedTimestamp, tags: mergedTags, text: mergedText };
    vttContent.splice(selectedBlocks[1], selectedBlocks.length - 1);

    selectedBlocks = [];
    displayVTT();
    updateMergeButtonVisibility();
}

document.getElementById('addTagButton').addEventListener('click', addTag);

function addTag() {
    const tag = prompt('Enter a tag (without #):');
    if (tag) {
        usedTags.add(tag);
        const selectedBlock = document.querySelector('.vtt-block.selected');
        if (selectedBlock) {
            const index = Array.from(selectedBlock.parentNode.children).indexOf(selectedBlock);
            vttContent[index].tags += `#${tag} `;
            displayVTT();
        }
    }
}


function addYAMLHeader(existingYaml) {
    const yamlEditor = document.getElementById('yamlEditor');
    if (existingYaml) {
        yamlEditor.textContent = existingYaml;
    } else {
        yamlEditor.textContent = `---
project:
interviewee:
date:
---
`;
    }
}

document.getElementById('saveButton').addEventListener('click', saveVTT);

function saveVTT() {
    const yaml = document.getElementById('yamlEditor').textContent;
    let content = yaml;
    if (!yaml.trim().startsWith('---')) {
        content = `---\n${yaml}\n---\n`;
    }
    content += '\nWEBVTT\n\n';
    vttContent.forEach(block => {
        content += block.timestamp + '\n' + block.tags + '\n' + block.text + '\n\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'edited.vtt';
    a.click();
}