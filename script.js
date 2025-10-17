class PokerGame {
    constructor() {
        this.players = [];
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.smallBlindIndex = 0;
        this.bigBlindIndex = 0;
        this.gamePhase = 'waiting'; // waiting, preflop, flop, turn, river, showdown
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.startingChips = 1000;
        this.playerCount = 2;
        
        this.initializeEventListeners();
        this.showSetupModal();
    }

    initializeEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('check').addEventListener('click', () => this.playerAction('check'));
        document.getElementById('call').addEventListener('click', () => this.playerAction('call'));
        document.getElementById('raise').addEventListener('click', () => this.playerAction('raise'));
        document.getElementById('fold').addEventListener('click', () => this.playerAction('fold'));
        document.getElementById('setup-confirm').addEventListener('click', () => this.setupGame());
        document.getElementById('close-showdown').addEventListener('click', () => this.closeShowdownModal());
    }

    showSetupModal() {
        document.getElementById('player-setup').style.display = 'flex';
    }

    setupGame() {
        this.playerCount = parseInt(document.getElementById('player-count').value);
        this.startingChips = parseInt(document.getElementById('starting-chips').value);
        this.smallBlind = parseInt(document.getElementById('small-blind').value);
        this.bigBlind = parseInt(document.getElementById('big-blind').value);
        
        document.getElementById('player-setup').style.display = 'none';
        this.initializePlayers();
        this.updateUI();
        this.addLog('游戏设置完成，点击"开始游戏"按钮开始');
    }

    initializePlayers() {
        this.players = [];
        for (let i = 0; i < this.playerCount; i++) {
            this.players.push({
                id: i,
                name: `玩家 ${i + 1}`,
                chips: this.startingChips,
                cards: [],
                bet: 0,
                folded: false,
                isDealer: false,
                isSmallBlind: false,
                isBigBlind: false,
                hasActed: false
            });
        }
        this.renderPlayers();
    }

    renderPlayers() {
        const playersArea = document.getElementById('players-area');
        if (!playersArea) {
            console.error('无法找到玩家区域');
            return;
        }
        playersArea.innerHTML = '';
        
        this.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player ${player.folded ? 'folded' : ''} ${player.id === this.currentPlayerIndex ? 'active' : ''}`;
            playerDiv.innerHTML = `
                <div class="player-name">${player.name} ${player.isDealer ? '(Dealer)' : ''} ${player.isSmallBlind ? '(SmallBlind)' : ''} ${player.isBigBlind ? '(BB)' : ''}</div>
                <div class="player-cards" id="player-cards-${player.id}"></div>
                <div class="player-chips">筹码: ${player.chips}</div>
                <div class="player-bet">下注: ${player.bet}</div>
                <div class="player-status">${player.folded ? '已弃牌' : '游戏中'}</div>
            `;
            playersArea.appendChild(playerDiv);
        });
        
        console.log('玩家区域已渲染');
    }

    startGame() {
        if (this.gamePhase !== 'waiting') return;
        
        this.resetGame();
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.postBlinds();
        this.gamePhase = 'preflop';
        this.currentPlayerIndex = (this.bigBlindIndex + 1) % this.playerCount;
        
        console.log('游戏开始，已发牌');
        console.log('玩家手牌:', this.players[0].cards);
        console.log('公共牌:', this.communityCards);
        
        this.updateUI();
        this.addLog('游戏开始！');
        this.addLog(`${this.players[this.smallBlindIndex].name} 下小盲注 ${this.smallBlind}`);
        this.addLog(`${this.players[this.bigBlindIndex].name} 下大盲注 ${this.bigBlind}`);
        
        if (this.currentPlayerIndex !== 0) {
            setTimeout(() => this.aiPlayerTurn(), 1000);
        }
    }

    resetGame() {
        this.deck = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.players.forEach(player => {
            player.cards = [];
            player.bet = 0;
            player.folded = false;
            player.hasActed = false;
            player.isDealer = false;
            player.isSmallBlind = false;
            player.isBigBlind = false;
        });
        
        this.dealerIndex = (this.dealerIndex + 1) % this.playerCount;
        this.smallBlindIndex = this.dealerIndex;
        this.bigBlindIndex = (this.dealerIndex + 1) % this.playerCount;
        
        this.players[this.dealerIndex].isDealer = true;
        this.players[this.smallBlindIndex].isSmallBlind = true;
        this.players[this.bigBlindIndex].isBigBlind = true;
    }

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const suitSymbols = {'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠'};
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push({
                    rank: rank,
                    suit: suit,
                    suitSymbol: suitSymbols[suit],
                    value: this.getCardValue(rank)
                });
            }
        }
    }

    getCardValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                player.cards.push(this.deck.pop());
            }
        }
        this.renderPlayerCards();
    }

    renderPlayerCards() {
        this.players.forEach(player => {
            const cardsDiv = document.getElementById(`player-cards-${player.id}`);
            if (!cardsDiv) {
                console.error(`无法找到玩家 ${player.id} 的卡片容器`);
                return;
            }
            cardsDiv.innerHTML = '';
            
            player.cards.forEach(card => {
                const cardDiv = document.createElement('div');
                if (player.id === 0) {
                    cardDiv.className = `card ${card.suit}`;
                    cardDiv.innerHTML = `
                        <div class="rank">${card.rank}</div>
                        <div class="suit">${card.suitSymbol}</div>
                    `;
                } else {
                    cardDiv.className = 'card back';
                }
                cardsDiv.appendChild(cardDiv);
            });
        });
        console.log('玩家牌已渲染');
    }

    postBlinds() {
        const smallBlindPlayer = this.players[this.smallBlindIndex];
        const bigBlindPlayer = this.players[this.bigBlindIndex];
        
        smallBlindPlayer.chips -= this.smallBlind;
        smallBlindPlayer.bet = this.smallBlind;
        
        bigBlindPlayer.chips -= this.bigBlind;
        bigBlindPlayer.bet = this.bigBlind;
        
        this.pot = this.smallBlind + this.bigBlind;
        this.currentBet = this.bigBlind;
    }

    playerAction(action) {
        if (this.currentPlayerIndex !== 0) return;
        
        const player = this.players[0];
        
        switch (action) {
            case 'check':
                if (this.currentBet > player.bet) return;
                this.addLog(`${player.name} 过牌`);
                break;
                
            case 'call':
                const callAmount = this.currentBet - player.bet;
                if (callAmount > player.chips) return;
                player.chips -= callAmount;
                player.bet += callAmount;
                this.pot += callAmount;
                this.addLog(`${player.name} 跟注 ${callAmount}`);
                break;
                
            case 'raise':
                const raiseAmount = parseInt(document.getElementById('raise-amount').value);
                const totalBet = this.currentBet + raiseAmount;
                const neededChips = totalBet - player.bet;
                if (neededChips > player.chips || raiseAmount < 1) return;
                player.chips -= neededChips;
                player.bet = totalBet;
                this.pot += neededChips;
                this.currentBet = totalBet;
                this.addLog(`${player.name} 加注到 ${totalBet}`);
                this.resetPlayerHasActed();
                break;
                
            case 'fold':
                player.folded = true;
                this.addLog(`${player.name} 弃牌`);
                break;
        }
        
        player.hasActed = true;
        this.nextPlayer();
    }

    aiPlayerTurn() {
        const player = this.players[this.currentPlayerIndex];
        if (player.folded) {
            this.nextPlayer();
            return;
        }
        
        const random = Math.random();
        const callAmount = this.currentBet - player.bet;
        
        if (callAmount === 0) {
            if (random < 0.3) {
                this.addLog(`${player.name} 过牌`);
            } else {
                const raiseAmount = Math.floor(Math.random() * 50) + 10;
                const totalBet = this.currentBet + raiseAmount;
                const neededChips = totalBet - player.bet;
                if (neededChips <= player.chips) {
                    player.chips -= neededChips;
                    player.bet = totalBet;
                    this.pot += neededChips;
                    this.currentBet = totalBet;
                    this.addLog(`${player.name} 加注到 ${totalBet}`);
                    this.resetPlayerHasActed();
                } else {
                    this.addLog(`${player.name} 过牌`);
                }
            }
        } else if (callAmount <= player.chips) {
            if (random < 0.2) {
                player.folded = true;
                this.addLog(`${player.name} 弃牌`);
            } else if (random < 0.7) {
                player.chips -= callAmount;
                player.bet += callAmount;
                this.pot += callAmount;
                this.addLog(`${player.name} 跟注 ${callAmount}`);
            } else {
                const raiseAmount = Math.floor(Math.random() * 50) + 10;
                const totalBet = this.currentBet + raiseAmount;
                const neededChips = totalBet - player.bet;
                if (neededChips <= player.chips) {
                    player.chips -= neededChips;
                    player.bet = totalBet;
                    this.pot += neededChips;
                    this.currentBet = totalBet;
                    this.addLog(`${player.name} 加注到 ${totalBet}`);
                    this.resetPlayerHasActed();
                } else {
                    player.chips -= callAmount;
                    player.bet += callAmount;
                    this.pot += callAmount;
                    this.addLog(`${player.name} 跟注 ${callAmount}`);
                }
            }
        } else {
            player.folded = true;
            this.addLog(`${player.name} 弃牌`);
        }
        
        player.hasActed = true;
        this.nextPlayer();
    }

    resetPlayerHasActed() {
        this.players.forEach(player => {
            if (!player.folded) {
                player.hasActed = false;
            }
        });
    }

    nextPlayer() {
        this.updateUI();
        
        if (this.checkRoundEnd()) {
            this.nextPhase();
            return;
        }
        
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        } while (this.players[this.currentPlayerIndex].folded);
        
        this.updateUI();
        
        if (this.currentPlayerIndex !== 0) {
            setTimeout(() => this.aiPlayerTurn(), 1000);
        }
    }

    checkRoundEnd() {
        const activePlayers = this.players.filter(p => !p.folded);
        if (activePlayers.length === 1) {
            this.endHand(activePlayers[0]);
            return true;
        }
        
        const allActed = activePlayers.every(p => p.hasActed);
        const allBetsEqual = activePlayers.every(p => p.bet === this.currentBet);
        
        return allActed && allBetsEqual;
    }

    nextPhase() {
        this.players.forEach(player => {
            player.bet = 0;
            player.hasActed = false;
        });
        this.currentBet = 0;
        
        switch (this.gamePhase) {
            case 'preflop':
                this.gamePhase = 'flop';
                this.dealFlop();
                break;
            case 'flop':
                this.gamePhase = 'turn';
                this.dealTurn();
                break;
            case 'turn':
                this.gamePhase = 'river';
                this.dealRiver();
                break;
            case 'river':
                this.gamePhase = 'showdown';
                this.showdown();
                return;
        }
        
        this.currentPlayerIndex = this.smallBlindIndex;
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        } while (this.players[this.currentPlayerIndex].folded);
        
        this.updateUI();
        this.addLog(`进入${this.gamePhase}阶段`);
        
        if (this.currentPlayerIndex !== 0) {
            setTimeout(() => this.aiPlayerTurn(), 1000);
        }
    }

    dealFlop() {
        this.deck.pop();
        for (let i = 0; i < 3; i++) {
            this.communityCards.push(this.deck.pop());
        }
        this.renderCommunityCards();
    }

    dealTurn() {
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.renderCommunityCards();
    }

    dealRiver() {
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.renderCommunityCards();
    }

    renderCommunityCards() {
        const communityDiv = document.getElementById('community-cards');
        if (!communityDiv) {
            console.error('无法找到公共牌容器');
            return;
        }
        communityDiv.innerHTML = '';
        
        this.communityCards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = `card ${card.suit}`;
            cardDiv.innerHTML = `
                <div class="rank">${card.rank}</div>
                <div class="suit">${card.suitSymbol}</div>
            `;
            communityDiv.appendChild(cardDiv);
        });
        console.log('公共牌已渲染，数量:', this.communityCards.length);
    }

    showdown() {
        const activePlayers = this.players.filter(p => !p.folded);
        
        // 为每个玩家评估手牌并添加日志
        activePlayers.forEach(player => {
            const result = this.evaluateHand(player);
            this.addLog(`${player.name} 的最佳牌型: ${result.type}`);
        });
        
        const winner = this.evaluateHands(activePlayers);
        if (winner) {
            this.addLog(`获胜者: ${winner.name} (${winner.handType})`);
            this.endHand(winner);
        } else {
            this.addLog('无法确定获胜者');
        }
    }

    evaluateHands(players) {
        let bestPlayer = null;
        let bestResult = { score: 0, type: '高牌' };
        
        for (let player of players) {
            const result = this.evaluateHand(player);
            if (result.score > bestResult.score) {
                bestResult = result;
                bestPlayer = player;
            }
        }
        
        return bestPlayer;
    }

    evaluateHand(player) {
        const allCards = [...player.cards, ...this.communityCards];
        const combinations = this.getCombinations(allCards, 5);
        
        let bestResult = { score: 0, type: '高牌' };
        for (let combo of combinations) {
            const result = this.getHandScore(combo);
            if (result.score > bestResult.score) {
                bestResult = result;
            }
        }
        
        player.handType = bestResult.type;
        player.handScore = bestResult.score;
        return bestResult;
    }

    getCombinations(arr, k) {
        const combinations = [];
        
        function backtrack(start, current) {
            if (current.length === k) {
                combinations.push([...current]);
                return;
            }
            
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        }
        
        backtrack(0, []);
        return combinations;
    }

    getHandScore(cards) {
        const sortedCards = cards.sort((a, b) => b.value - a.value);
        const suits = cards.map(c => c.suit);
        const values = sortedCards.map(c => c.value);
        const ranks = sortedCards.map(c => c.rank);
        
        const isFlush = suits.every(s => s === suits[0]);
        const isStraight = this.checkStraight(values);
        const isWheelStraight = this.checkWheelStraight(values);
        const groups = this.groupByRank(sortedCards);
        const counts = Object.values(groups).sort((a, b) => b - a);
        
        // 皇家同花顺 (10-J-Q-K-A 同花色)
        if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
            return { score: 9000000 + values[4], type: '皇家同花顺' };
        }
        
        // 同花顺 (包括A-5的特殊情况)
        if (isFlush && isStraight) {
            return { score: 8000000 + values[4], type: '同花顺' };
        }
        if (isFlush && isWheelStraight) {
            return { score: 8000000 + 5, type: '同花顺' };
        }
        
        // 四条
        if (counts[0] === 4) {
            const fourOfAKindValue = this.getHighCard(groups, 4);
            const kickerValue = this.getHighCard(groups, 1);
            return { score: 7000000 + fourOfAKindValue * 100 + kickerValue, type: '四条' };
        }
        
        // 葫芦
        if (counts[0] === 3 && counts[1] === 2) {
            const threeOfAKindValue = this.getHighCard(groups, 3);
            const pairValue = this.getHighCard(groups, 2);
            return { score: 6000000 + threeOfAKindValue * 100 + pairValue, type: '葫芦' };
        }
        
        // 同花
        if (isFlush) {
            return { score: 5000000 + this.getHighCardByValues(values), type: '同花' };
        }
        
        // 顺子 (包括A-5的特殊情况)
        if (isStraight) {
            return { score: 4000000 + values[4], type: '顺子' };
        }
        if (isWheelStraight) {
            return { score: 4000000 + 5, type: '顺子' };
        }
        
        // 三条
        if (counts[0] === 3) {
            const threeOfAKindValue = this.getHighCard(groups, 3);
            const kickers = this.getKickerValues(groups, 1, 2);
            return { score: 3000000 + threeOfAKindValue * 10000 + kickers[0] * 100 + kickers[1], type: '三条' };
        }
        
        // 两对
        if (counts[0] === 2 && counts[1] === 2) {
            return { score: 2000000 + this.getTwoPairScore(groups), type: '两对' };
        }
        
        // 一对
        if (counts[0] === 2) {
            const pairValue = this.getHighCard(groups, 2);
            const kickers = this.getKickerValues(groups, 1, 3);
            return { score: 1000000 + pairValue * 10000 + kickers[0] * 100 + kickers[1] + kickers[2] / 100, type: '一对' };
        }
        
        // 高牌 - 使用更小的基数，确保高牌是最低的牌型
        // 高牌分数应该在0-999999范围内，而其他牌型都从1000000开始
        return { score: this.getHighCardByValues(values), type: '高牌' };
    }

    checkStraight(values) {
        // 检查普通顺子
        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] - values[i + 1] !== 1) {
                return false;
            }
        }
        return true;
    }

    checkWheelStraight(values) {
        // 检查A-2-3-4-5的特殊顺子
        return values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;
    }

    groupByRank(cards) {
        const groups = {};
        for (let card of cards) {
            const rank = card.rank;
            groups[rank] = (groups[rank] || 0) + 1;
        }
        return groups;
    }

    getHighCard(groups, count) {
        let maxValue = 0;
        for (let rank in groups) {
            if (groups[rank] === count) {
                const value = this.getRankValue(rank);
                if (value > maxValue) {
                    maxValue = value;
                }
            }
        }
        return maxValue;
    }

    getHighCardByValues(values) {
        // 使用更合理的权重系统计算高牌分数
        // 确保高牌分数始终低于1000000（一对的最低分数）
        // 第一张牌权重最高，依次递减
        return values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
    }

    getTwoPairScore(groups) {
        const pairs = [];
        let kicker = 0;
        
        for (let rank in groups) {
            const value = this.getRankValue(rank);
            if (groups[rank] === 2) {
                pairs.push(value);
            } else if (groups[rank] === 1) {
                kicker = Math.max(kicker, value);
            }
        }
        
        pairs.sort((a, b) => b - a);
        return pairs[0] * 10000 + pairs[1] * 100 + kicker;
    }

    getKickerValues(groups, count, needed) {
        const kickers = [];
        
        for (let rank in groups) {
            if (groups[rank] === count) {
                kickers.push(this.getRankValue(rank));
            }
        }
        
        kickers.sort((a, b) => b - a);
        return kickers.slice(0, needed);
    }

    // 添加牌型比较方法，用于调试和验证
    compareHands(player1, player2) {
        if (player1.handScore > player2.handScore) {
            return `${player1.name} 的 ${player1.handType} 大于 ${player2.name} 的 ${player2.handType}`;
        } else if (player1.handScore < player2.handScore) {
            return `${player2.name} 的 ${player2.handType} 大于 ${player1.name} 的 ${player1.handType}`;
        } else {
            return `${player1.name} 和 ${player2.name} 的 ${player1.handType} 相同`;
        }
    }

    getRankValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    }

    endHand(winner) {
        winner.chips += this.pot;
        winner.isWinner = true;
        this.addLog(`${winner.name} 以 ${winner.handType} 赢得 ${this.pot} 筹码！`);
        this.pot = 0;
        this.gamePhase = 'waiting';
        
        this.revealAllCards();
        this.showHandResults();
        this.showShowdownModal();
        this.updateUI();
    }

    revealAllCards() {
        this.players.forEach(player => {
            if (!player.folded) {
                const cardsDiv = document.getElementById(`player-cards-${player.id}`);
                cardsDiv.innerHTML = '';
                
                player.cards.forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = `card ${card.suit}`;
                    cardDiv.innerHTML = `
                        <div class="rank">${card.rank}</div>
                        <div class="suit">${card.suitSymbol}</div>
                    `;
                    cardsDiv.appendChild(cardDiv);
                });
            }
        });
    }

    showHandResults() {
        this.players.forEach(player => {
            if (!player.folded) {
                const playerDiv = document.querySelector(`.player:nth-child(${player.id + 1})`);
                if (!playerDiv) return;
                
                // 移除之前的获胜者样式
                playerDiv.classList.remove('winner-player');
                
                const handTypeDiv = document.createElement('div');
                handTypeDiv.className = 'player-hand-type';
                handTypeDiv.textContent = player.handType || '未知牌型';
                
                if (player.isWinner) {
                    handTypeDiv.classList.add('winner');
                    playerDiv.classList.add('winner-player');
                }
                
                const existingHandType = playerDiv.querySelector('.player-hand-type');
                if (existingHandType) {
                    existingHandType.replaceWith(handTypeDiv);
                } else {
                    playerDiv.appendChild(handTypeDiv);
                }
            }
        });
    }

    showShowdownModal() {
        const modal = document.getElementById('showdown-modal');
        const resultsDiv = document.getElementById('showdown-results');
        
        resultsDiv.innerHTML = '';
        
        const activePlayers = this.players.filter(p => !p.folded);
        
        activePlayers.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `showdown-player ${player.isWinner ? 'winner' : ''}`;
            
            const cardsHtml = player.cards.map(card => `
                <div class="card ${card.suit}">
                    <div class="rank">${card.rank}</div>
                    <div class="suit">${card.suitSymbol}</div>
                </div>
            `).join('');
            
            playerDiv.innerHTML = `
                <div class="showdown-player-info">
                    <div class="showdown-player-cards">${cardsHtml}</div>
                    <div class="showdown-player-details">
                        <div class="showdown-player-name">${player.name}</div>
                        <div class="showdown-player-hand">${player.handType}</div>
                        <div class="showdown-player-chips">筹码: ${player.chips}</div>
                    </div>
                </div>
                ${player.isWinner ? '<div class="winner-badge">🏆 获胜者</div>' : ''}
            `;
            
            resultsDiv.appendChild(playerDiv);
        });
        
        modal.style.display = 'flex';
    }

    closeShowdownModal() {
        document.getElementById('showdown-modal').style.display = 'none';
        this.resetForNewHand();
    }

    resetForNewHand() {
        this.communityCards = [];
        this.renderCommunityCards();
        this.players.forEach(player => {
            player.isWinner = false;
            player.handType = null;
            player.handScore = 0;
            player.cards = [];
            player.bet = 0;
            player.folded = false;
            player.hasActed = false;
        });
        this.renderPlayers();
        this.updateUI();
        this.addLog('准备下一局...');
    }

    updateUI() {
        this.renderPlayers();
        this.renderPlayerCards();
        this.renderCommunityCards();
        document.getElementById('pot').textContent = `底池: ${this.pot}`;
        document.getElementById('round').textContent = `回合: ${this.getPhaseText()}`;
        document.getElementById('pot-chips').textContent = this.pot;
        
        const isPlayerTurn = this.currentPlayerIndex === 0 && this.gamePhase !== 'waiting';
        const player = this.players[0];
        
        document.getElementById('check').disabled = !isPlayerTurn || this.currentBet > player.bet;
        document.getElementById('call').disabled = !isPlayerTurn || this.currentBet === player.bet;
        document.getElementById('raise').disabled = !isPlayerTurn;
        document.getElementById('fold').disabled = !isPlayerTurn;
        document.getElementById('raise-amount').disabled = !isPlayerTurn;
        document.getElementById('start-game').disabled = this.gamePhase !== 'waiting';
        
        if (isPlayerTurn && this.currentBet > player.bet) {
            document.getElementById('call').textContent = `跟注 ${this.currentBet - player.bet}`;
        } else {
            document.getElementById('call').textContent = '跟注';
        }
    }

    getPhaseText() {
        switch (this.gamePhase) {
            case 'waiting': return '等待开始';
            case 'preflop': return '翻牌前';
            case 'flop': return '翻牌';
            case 'turn': return '转牌';
            case 'river': return '河牌';
            case 'showdown': return '摊牌';
            default: return '未知';
        }
    }

    addLog(message) {
        const logContent = document.getElementById('log-content');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = message;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }
}

const game = new PokerGame();