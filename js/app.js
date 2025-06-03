// グローバル変数
let currentLanguage = 'ja';
let currentQuestionIndex = 0;
let userAnswers = [];
let questions = [];
let translations = {};
let config = {};
let scores = {
    S1: 0, M1: 0, P1: 0, V2: 0, M2: 0, G2: 0, A3: 0, M3: 0, E3: 0, CL: 0
};

// データの読み込み
async function loadData() {
    try {
        // ローディング画面を表示
        document.getElementById('loading-screen').style.display = 'flex';
        
        // データファイルを並列で読み込み
        const [questionsData, translationsData, configData] = await Promise.all([
            fetch('./data/questions.json').then(r => r.json()),
            fetch('./data/translations.json').then(r => r.json()),
            fetch('./data/config.json').then(r => r.json())
        ]);
        
        questions = questionsData.questions;
        translations = translationsData;
        config = configData;
        
        // ユーザー回答配列を初期化
        userAnswers = new Array(questions.length).fill(null);
        
        // UIを更新
        updateUI();
        
        // ローディング画面を非表示
        document.getElementById('loading-screen').style.display = 'none';
        
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
    }
}

// 言語変更
function changeLanguage() {
    currentLanguage = document.getElementById('language-select').value;
    updateUI();
}

// UI更新
function updateUI() {
    const t = translations[currentLanguage] || translations.ja;
    
    // ボタンのテキスト更新
    document.getElementById('start-button').textContent = t.startButton;
    document.getElementById('next-button').textContent = t.nextButton;
    document.getElementById('prev-button').textContent = t.prevButton;
    document.getElementById('restart-button').textContent = t.restartButton;
    
    // タイトルとテキストの更新
    document.getElementById('result-title').textContent = t.resultTitle;
    document.getElementById('result-intro').textContent = t.resultIntro;
    document.getElementById('result-note').textContent = t.resultNote;
    document.getElementById('intro-text-1').textContent = t.introText1;
    document.getElementById('intro-text-2').textContent = t.introText2;
    
    // クイズ画面が表示されている場合は質問を更新
    if (document.getElementById('quiz-screen').style.display === 'block') {
        loadQuestion();
    }
}

// クイズ開始
function startQuiz() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    currentQuestionIndex = 0;
    loadQuestion();
}

// 質問表示
function loadQuestion() {
    const question = questions[currentQuestionIndex];
    const t = translations[currentLanguage] || translations.ja;
    
    // 質問カウンター更新
    const counter = t.questionCounter
        .replace('{current}', currentQuestionIndex + 1)
        .replace('{total}', questions.length);
    document.getElementById('question-counter').textContent = counter;
    
    // 質問文と補足説明を表示
    const questionText = question.translations?.[currentLanguage]?.question || question.question;
    const supplementText = question.translations?.[currentLanguage]?.supplement || question.supplement;
    
    document.getElementById('question-text').textContent = questionText;
    document.getElementById('question-supplement').textContent = supplementText || '';
    
    // 選択肢エリアをクリア
    const choicesArea = document.getElementById('choices-area');
    choicesArea.innerHTML = '';
    
    // 選択肢を作成
    if (question.isMChoice) {
        // 3択質問の場合
        const axisNum = question.targetScore.charAt(1);
        const mChoices = t.mChoices[`axis${axisNum}`];
        
        mChoices.forEach((choice, index) => {
            const button = createChoiceButton(choice, index);
            choicesArea.appendChild(button);
        });
    } else {
        // 5択質問の場合
        const choices = [
            t.choices.strongly_disagree,
            t.choices.disagree,
            t.choices.neutral,
            t.choices.agree,
            t.choices.strongly_agree
        ];
        
        choices.forEach((choice, index) => {
            const button = createChoiceButton(choice, config.scoring.choiceScores[index]);
            choicesArea.appendChild(button);
        });
    }
    
    // 前の回答があれば選択状態を復元
    if (userAnswers[currentQuestionIndex] !== null) {
        const buttons = choicesArea.querySelectorAll('.choice-button');
        const answerIndex = questions[currentQuestionIndex].isMChoice 
            ? userAnswers[currentQuestionIndex]
            : config.scoring.choiceScores.indexOf(userAnswers[currentQuestionIndex]);
        
        if (answerIndex !== -1 && buttons[answerIndex]) {
            buttons[answerIndex].classList.add('selected');
        }
        document.getElementById('next-button').disabled = false;
    } else {
        document.getElementById('next-button').disabled = true;
    }
    
    // ボタンの表示制御
    document.getElementById('prev-button').style.display = 
        currentQuestionIndex > 0 ? 'inline-block' : 'none';
    
    // プログレスバー更新
    updateProgressBar();
}

// 選択肢ボタン作成
function createChoiceButton(text, value) {
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.textContent = text;
    button.onclick = () => selectAnswer(value);
    return button;
}

// 回答選択
function selectAnswer(value) {
    userAnswers[currentQuestionIndex] = value;
    
    // 選択状態を更新
    const buttons = document.querySelectorAll('.choice-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    const question = questions[currentQuestionIndex];
    const selectedIndex = question.isMChoice 
        ? value 
        : config.scoring.choiceScores.indexOf(value);
    
    if (selectedIndex !== -1 && buttons[selectedIndex]) {
        buttons[selectedIndex].classList.add('selected');
    }
    
    document.getElementById('next-button').disabled = false;
}

// 次の質問
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        showResults();
    }
}

// 前の質問
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// プログレスバー更新
function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
}

// 結果表示
function showResults() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    
    // 結果を計算
    const result = calculateResult();
    document.getElementById('result-code').textContent = result;
}

// 結果計算
function calculateResult() {
    // スコアをリセット
    for (let key in scores) {
        scores[key] = 0;
    }
    
    // 各質問の回答をスコアに反映
    questions.forEach((question, index) => {
        const answer = userAnswers[index];
        if (answer === null) return;
        
        if (question.isMChoice) {
            // 3択質問の処理
            const axisNum = question.targetScore.charAt(1);
            if (answer === 0) {
                scores[axisNum === '1' ? 'S1' : axisNum === '2' ? 'V2' : 'A3'] += 2;
            } else if (answer === 1) {
                scores[axisNum === '1' ? 'P1' : axisNum === '2' ? 'G2' : 'E3'] += 2;
            } else if (answer === 2) {
                scores[`M${axisNum}`] += 2;
            }
        } else if (question.targetScore === 'CL') {
            // 意識レベル質問の処理
            const processedScore = question.scoreEffect === 1 ? answer : -answer;
            scores.CL += processedScore;
        } else {
            // その他の質問
            scores[question.targetScore] += answer;
        }
    });
    
    // タイプを決定
    const typeCode = determineType();
    const level = determineLevel();
    
    return `${typeCode}-${level}`;
}

// タイプ決定
function determineType() {
    // 第1軸
    let axis1 = 'M';
    if (scores.S1 > scores.M1 && scores.S1 > scores.P1) axis1 = 'S';
    else if (scores.P1 > scores.M1 && scores.P1 > scores.S1) axis1 = 'P';
    
    // 第2軸
    let axis2 = 'M';
    if (scores.V2 > scores.M2 && scores.V2 > scores.G2) axis2 = 'V';
    else if (scores.G2 > scores.M2 && scores.G2 > scores.V2) axis2 = 'G';
    
    // 第3軸
    let axis3 = 'M';
    if (scores.A3 > scores.M3 && scores.A3 > scores.E3) axis3 = 'A';
    else if (scores.E3 > scores.M3 && scores.E3 > scores.A3) axis3 = 'E';
    
    return axis1 + axis2 + axis3;
}

// レベル決定
function determineLevel() {
    const clScore = scores.CL;
    const thresholds = config.scoring.levelThresholds;
    
    if (clScore <= thresholds.level1_end) return 1;
    if (clScore <= thresholds.level2_end) return 2;
    if (clScore <= thresholds.level3_end) return 3;
    if (clScore <= thresholds.level4_end) return 4;
    if (clScore <= thresholds.level5_end) return 5;
    
    // レベル6は特別な条件が必要
    // ここでは簡略化して、非常に高いスコアの場合のみ
    if (clScore >= 61) {
        // 追加の条件チェックをここに実装
        return 6;
    }
    
    return 5;
}

// リスタート
function restartQuiz() {
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    for (let key in scores) {
        scores[key] = 0;
    }
    
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('progress-fill').style.width = '0%';
}

// ページ読み込み時にデータを読み込む
window.addEventListener('DOMContentLoaded', loadData);
