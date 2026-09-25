> Phạm vi: tài liệu thiết kế mục tiêu và ví dụ tham khảo, chưa phải mô tả đầy đủ của bản đang chạy. Hiện trạng: [PROJECT_STATUS](PROJECT_STATUS.md); hành vi đã triển khai: [backend](../backend/README.md), [frontend](../frontend/README.md); cách chạy hiện hành: [QUICK_START](../QUICK_START.md).

# Chiến Lược AI & ML

## 1. Tổng Quan Chiến Lược AI

Ứng dụng sẽ sử dụng **kết hợp nhiều mô hình AI** để cung cấp phân tích toàn diện và lời khuyên đầu tư chính xác:

```
┌──────────────────────────────────────────────────────────────┐
│         Người Dùng & Dữ Liệu Đầu Vào                          │
│  ├─ User Profile (risk tolerance, assets, preferences)      │
│  ├─ Market Data (prices, volume, indicators)                │
│  ├─ Company Data (financial statements, ratios)             │
│  ├─ News & Sentiment (articles, social media)               │
│  └─ External Factors (economic, political, weather)         │
└──────────────┬───────────────────────────────────────────────┘
               │
        ┌──────▼───────┐
        │ Data Pipeline │
        │ & Processing  │
        └──────┬────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼───┐  ┌───▼──────┐
│ Tech │  │ Funda- │  │ Sentiment│
│ Anlys│  │ mental │  │ Analysis │
└───┬──┘  └───┬───┘  └───┬──────┘
    │         │          │
    └─────────┼──────────┘
              │
        ┌─────▼──────┐
        │   LLM AI   │
        │ (GPT-4, etc)
        └─────┬──────┘
              │
        ┌─────▼──────────┐
        │ Recommendation │
        │    Engine      │
        └─────┬──────────┘
              │
        ┌─────▼──────────┐
        │ User-Facing    │
        │ Output (Chat,  │
        │ Suggestions)   │
        └────────────────┘
```

---

## 2. Các Mô Hình AI/ML Chính

### 2.1 Technical Analysis Engine

**Mục Đích**: Phân tích biến động giá và khối lượng giao dịch

**Các Chỉ Số Sử Dụng**:
- Moving Average (MA)
- Relative Strength Index (RSI)
- Bollinger Bands
- MACD
- Stochastic Oscillator
- Volume Profile
- Fibonacci Levels

**Implementation**:
```python
# libraries: TA-Lib, pandas-ta
import talib
import pandas as pd

def analyze_technical(prices, volumes):
    # Calculate Moving Averages
    ma_20 = talib.SMA(prices, timeperiod=20)
    ma_50 = talib.SMA(prices, timeperiod=50)
    ma_200 = talib.SMA(prices, timeperiod=200)
    
    # RSI
    rsi = talib.RSI(prices, timeperiod=14)
    
    # MACD
    macd, macsignal, macdhist = talib.MACD(prices)
    
    # Signal generation
    buy_signal = (ma_20 > ma_50 > ma_200) and (rsi < 70)
    sell_signal = (ma_20 < ma_50 < ma_200) and (rsi > 30)
    
    return {
        'moving_averages': {'ma_20': ma_20, 'ma_50': ma_50, 'ma_200': ma_200},
        'rsi': rsi,
        'macd': macd,
        'buy_signal': buy_signal,
        'sell_signal': sell_signal
    }
```

**Output**: Buy/Hold/Sell signals, Support/Resistance levels, Trend strength

---

### 2.2 Fundamental Analysis Engine

**Mục Đích**: Đánh giá giá trị nội tại của cổ phiếu dựa trên tình hình tài chính

**Các Metrics Sử Dụng**:
- P/E Ratio (Price-to-Earnings)
- P/B Ratio (Price-to-Book)
- ROE, ROA (Return on Equity/Assets)
- Debt-to-Equity Ratio
- Current Ratio, Quick Ratio
- Earnings Growth Rate
- Free Cash Flow
- Dividend Yield

**Implementation**:
```python
def fundamental_analysis(company_financials):
    """
    Tính toán các chỉ số cơ bản
    """
    pe_ratio = company_financials['price'] / company_financials['eps']
    pb_ratio = company_financials['price'] / company_financials['book_value_per_share']
    roe = company_financials['net_income'] / company_financials['equity']
    
    # So sánh với industry average
    industry_pe_avg = get_industry_avg('pe_ratio', company_financials['sector'])
    
    # Valuation assessment
    if pe_ratio < industry_pe_avg * 0.8:
        valuation = 'UNDERVALUED'
    elif pe_ratio > industry_pe_avg * 1.2:
        valuation = 'OVERVALUED'
    else:
        valuation = 'FAIR'
    
    return {
        'pe_ratio': pe_ratio,
        'pb_ratio': pb_ratio,
        'roe': roe,
        'valuation': valuation,
        'growth_score': calculate_growth_score(company_financials)
    }
```

**Output**: Valuation status, Growth score, Financial health rating

---

### 2.3 Sentiment Analysis Engine

**Mục Đích**: Phân tích cảm tình thị trường từ news, social media

**Data Sources**:
- Financial news (VNExpress, CafeF, etc.)
- Social media (Twitter, Facebook)
- Analyst reports
- Company announcements

**Implementation**:
```python
from transformers import pipeline
from textblob import TextBlob

# Pre-trained Vietnamese sentiment model
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="xkliv/vn-covid-sentiment",  # Vietnamese model
    device=0
)

def analyze_sentiment(text_data):
    """Phân tích cảm tính từ text"""
    sentiments = []
    
    for text in text_data:
        # Analyze sentiment
        result = sentiment_analyzer(text)
        label = result[0]['label']  # POS, NEG, NEU
        score = result[0]['score']
        
        # Extract keywords
        keywords = extract_keywords_and_entities(text)
        
        sentiments.append({
            'text': text,
            'sentiment': label,
            'confidence': score,
            'keywords': keywords,
            'timestamp': datetime.now()
        })
    
    # Aggregate sentiment
    avg_sentiment = aggregate_sentiments(sentiments)
    
    return {
        'overall_sentiment': avg_sentiment,
        'trending_topics': get_trending_topics(sentiments),
        'sentiment_trend': calculate_sentiment_trend(sentiments)
    }
```

**Output**: Overall market sentiment (Positive/Negative/Neutral), Key topics, Sentiment trend

---

### 2.4 Price Prediction Engine

**Mục Đích**: Dự đoán xu hướng giá trong tương lai ngắn hạn (1-4 tuần)

**Approaches**:
1. **Time Series ARIMA/Auto-ARIMA**
2. **LSTM/RNN Neural Networks**
3. **Prophet (Facebook)**
4. **XGBoost Regression**

**Implementation**:
```python
from sklearn.preprocessing import MinMaxScaler
from keras.models import Sequential
from keras.layers import LSTM, Dense
import numpy as np

def lstm_price_prediction(historical_prices, lookahead=20):
    """
    Sử dụng LSTM để dự đoán giá
    """
    # Prepare data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(historical_prices.reshape(-1, 1))
    
    # Create sequences
    look_back = 60  # Use 60 days to predict
    X_train, y_train = create_sequences(scaled_prices, look_back)
    
    # Build LSTM model
    model = Sequential([
        LSTM(50, activation='relu', input_shape=(look_back, 1)),
        LSTM(50, activation='relu'),
        Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mse')
    model.fit(X_train, y_train, epochs=50, batch_size=32, verbose=0)
    
    # Make prediction
    last_sequence = scaled_prices[-look_back:]
    future_prices = []
    
    for i in range(lookahead):
        next_price = model.predict(last_sequence.reshape(1, look_back, 1))
        future_prices.append(next_price[0, 0])
        last_sequence = np.append(last_sequence[1:], next_price)
    
    # Inverse scale
    predicted_prices = scaler.inverse_transform(
        np.array(future_prices).reshape(-1, 1)
    )
    
    return {
        'predicted_prices': predicted_prices,
        'confidence_interval': calculate_confidence_interval(model, predicted_prices),
        'trend': 'UP' if predicted_prices[-1] > historical_prices[-1] else 'DOWN'
    }
```

**Output**: Price forecast, Confidence intervals, Trend direction

---

### 2.5 Risk Assessment Engine

**Mục Đích**: Đánh giá rủi ro dựa trên portfolio và ngưỡng rủi ro của người dùng

**Risk Metrics**:
- Volatility (Standard Deviation)
- Value at Risk (VaR)
- Sharpe Ratio
- Beta (Market sensitivity)
- Correlation with market
- Diversification ratio

**Implementation**:
```python
def assess_risk(portfolio, market_data):
    """
    Đánh giá rủi ro portfolio
    """
    # Calculate returns
    returns = calculate_returns(portfolio, market_data)
    
    # Volatility
    volatility = np.std(returns)
    
    # Value at Risk (95% confidence)
    var_95 = np.percentile(returns, 5)
    
    # Sharpe Ratio
    risk_free_rate = 0.02  # 2% annual
    sharpe_ratio = (np.mean(returns) - risk_free_rate) / volatility
    
    # Portfolio Beta
    beta = calculate_beta(portfolio, market_data)
    
    # Concentration risk
    concentration_risk = calculate_concentration_risk(portfolio)
    
    # Risk rating
    if volatility > 0.25:
        risk_level = 'HIGH'
    elif volatility > 0.15:
        risk_level = 'MEDIUM'
    else:
        risk_level = 'LOW'
    
    return {
        'volatility': volatility,
        'var_95': var_95,
        'sharpe_ratio': sharpe_ratio,
        'beta': beta,
        'concentration_risk': concentration_risk,
        'risk_level': risk_level,
        'recommendations': generate_risk_recommendations(risk_level, portfolio)
    }
```

**Output**: Risk level, VaR, Risk metrics, Risk mitigation recommendations

---

### 2.6 LLM-Powered AI Advisor

**Mục Đích**: Cung cấp lời khuyên đầu tư dựa trên cuộc trò chuyện, tích hợp dữ liệu phân tích

**Technology Stack**:
- **LLM Model**: OpenAI GPT-4, Claude 3, hoặc local alternatives
- **Framework**: LangChain, LlamaIndex
- **Context Management**: Prompt engineering, Retrieval-Augmented Generation (RAG)

**Implementation**:
```python
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

class AIInvestmentAdvisor:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.7,
            streaming=True,
            callbacks=[StreamingStdOutCallbackHandler()]
        )
        self.memory = ConversationBufferMemory()
        
        self.system_prompt = PromptTemplate(
            input_variables=["user_profile", "market_data", "portfolio", "question"],
            template="""
            Bạn là một chuyên gia phân tích đầu tư chứng khoán Việt Nam.
            
            Hồ sơ người dùng:
            {user_profile}
            
            Dữ liệu thị trường hiện tại:
            {market_data}
            
            Danh mục hiện tại của người dùng:
            {portfolio}
            
            Câu hỏi: {question}
            
            Dựa trên các yếu tố trên, cung cấp lời khuyên đầu tư chi tiết, cân bằng 
            giữa cơ hội lợi nhuận và quản lý rủi ro.
            """
        )
    
    def get_investment_advice(self, user_profile, market_data, portfolio, question):
        """
        Lấy lời khuyên từ AI advisor
        """
        # Get analysis data
        technical_analysis = get_technical_analysis()
        fundamental_analysis = get_fundamental_analysis()
        sentiment_analysis = get_sentiment_analysis()
        risk_assessment = get_risk_assessment(portfolio)
        
        # Combine into context
        market_context = {
            'technical': technical_analysis,
            'fundamental': fundamental_analysis,
            'sentiment': sentiment_analysis,
            'risk': risk_assessment
        }
        
        # Generate prompt
        prompt = self.system_prompt.format(
            user_profile=json.dumps(user_profile),
            market_data=json.dumps(market_context),
            portfolio=json.dumps(portfolio),
            question=question
        )
        
        # Get response from LLM
        response = self.llm(prompt)
        
        # Store in memory for context continuity
        self.memory.save_context(
            {"input": question},
            {"output": response}
        )
        
        return response
    
    def get_conversation_history(self):
        """Lấy lịch sử trò chuyện"""
        return self.memory.buffer
```

**Features**:
- Natural language understanding
- Multi-turn conversations
- Context from all analysis engines
- Personalized advice based on user profile
- Risk-adjusted recommendations

---

### 2.7 Recommendation Engine

**Mục Đích**: Tự động gợi ý danh sách cổ phiếu phù hợp cho mỗi người dùng

**Algorithm**:
```python
def generate_recommendations(user_profile, available_stocks, num_recommendations=5):
    """
    Tạo danh sách gợi ý cổ phiếu
    """
    recommendations = []
    
    for stock in available_stocks:
        # Get all analysis
        tech_score = get_technical_score(stock)
        fund_score = get_fundamental_score(stock)
        sentiment_score = get_sentiment_score(stock)
        risk_score = get_risk_score(stock, user_profile['risk_tolerance'])
        
        # Calculate composite score
        weights = {
            'technical': 0.25,
            'fundamental': 0.35,
            'sentiment': 0.20,
            'risk_fit': 0.20
        }
        
        composite_score = (
            weights['technical'] * tech_score +
            weights['fundamental'] * fund_score +
            weights['sentiment'] * sentiment_score +
            weights['risk_fit'] * risk_score
        )
        
        # Check sector preferences
        if stock['sector'] in user_profile['preferred_sectors']:
            composite_score *= 1.1  # Boost score
        
        recommendations.append({
            'stock_id': stock['id'],
            'stock_name': stock['name'],
            'score': composite_score,
            'rationale': f"Technical: {tech_score}, Fundamental: {fund_score}, "
                        f"Sentiment: {sentiment_score}, Risk Fit: {risk_score}",
            'action': 'BUY' if composite_score > 0.7 else 'HOLD' if composite_score > 0.5 else 'SELL',
            'target_price': calculate_target_price(stock),
            'stop_loss': calculate_stop_loss(stock)
        })
    
    # Sort by score and return top N
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:num_recommendations]
```

**Output**: Ranked list of stocks with scores, rationale, action points

---

## 3. Data Flow cho AI Pipeline

```
Historical Data ──┐
                  │
Market Data ──────┼──→ Technical Analysis
                  │
Company Data ─────┼──→ Fundamental Analysis
                  │
News/Social ──────┼──→ Sentiment Analysis
                  │
User Profile ─────┼──→ Risk Assessment
                  │
                  └──→ LLM Processing
                       ↓
                  Recommendation Engine
                       ↓
                  User-Facing Output
                  (Chat, Suggestions, Reports)
```

---

## 4. Training & Model Management

### Model Training Strategy
```python
# Scheduled retraining every week
@scheduler.scheduled_job('cron', day_of_week='0', hour='2')  # Sunday 2 AM
def retrain_models():
    # Fetch latest data
    historical_prices = fetch_last_n_days(365)
    company_financials = fetch_latest_financials()
    news_data = fetch_last_n_days_news(30)
    
    # Retrain each model
    retrain_technical_analysis(historical_prices)
    retrain_fundamental_scores(company_financials)
    retrain_sentiment_model(news_data)
    retrain_price_prediction(historical_prices)
    
    # Validate models
    validate_model_performance()
    
    # Save models
    save_models_to_disk()
```

### Model Versioning
- Keep previous models for A/B testing
- Track performance metrics
- Automatic rollback on degradation

---

## 5. Monitoring & Performance

### Metrics to Track
- **Technical Accuracy**: Signal accuracy rate
- **Fundamental Accuracy**: Valuation accuracy vs. actual
- **Sentiment Correlation**: Sentiment vs. price movement
- **Prediction Accuracy**: RMSE, MAE for price predictions
- **Recommendation Performance**: % of buy signals that went up
- **LLM Quality**: User satisfaction rate, response relevance

### Continuous Improvement
- A/B test different model versions
- Collect user feedback
- Monitor model drift
- Regular retraining with new data

---

## 6. Ethical Considerations

- ⚠️ **Disclaimer**: Not financial advice, for analysis purposes only
- 🔒 **Data Privacy**: Encrypt sensitive user data
- 📊 **Transparency**: Explain model decisions to users
- ⚖️ **Fairness**: Avoid bias in recommendations
- 🚫 **Risk**: Always emphasize risk warnings

---

*Chiến lược này có thể được điều chỉnh dựa trên nguồn dữ liệu có sẵn và năng lực tính toán*

## Phân tích đa khung thời gian và bằng chứng doanh nghiệp

Phân tích chuyên sâu của từng mã kết hợp ba lớp bằng chứng: kỹ thuật và kỳ vọng thị trường, báo cáo tài chính đã xác minh, cùng tin tức/sự kiện họp cổ đông. Mỗi lớp phải có trạng thái nguồn rõ ràng; thiếu dữ liệu không được tự suy diễn thành tín hiệu tích cực hoặc tiêu cực.

Kết quả hiển thị lời khuyên riêng cho ngắn hạn, trung hạn và dài hạn. Ngắn hạn ưu tiên điểm vào, RSI và stop loss; trung hạn theo dõi xu hướng SMA20 và cập nhật báo cáo; dài hạn yêu cầu xác minh nền tảng tài chính và triển vọng doanh nghiệp. Các khung thời gian chỉ là tham khảo nghiên cứu, không thay thế quyết định đầu tư.


## Expert guidance và Ichimoku trong Chi tiết mã

Kết quả phân tích chuyên sâu hiện có thêm Ichimoku (Tenkan 9, Kijun 26, Senkou B 52), trạng thái giá so với mây, cùng lập trường rule-based và các điều kiện xác nhận. Giao diện tách rõ các việc cần theo dõi (SMA/EMA, RSI, Ichimoku, khối lượng, báo cáo tài chính, tin họp cổ đông), các hành động nên tránh và nhận định theo ba kỳ hạn ngắn, trung, dài.

Các nhận định chỉ là diễn giải minh bạch từ dữ liệu hiện có. Khi thiếu báo cáo tài chính, tin tức hoặc dữ liệu giá đủ dài, hệ thống hiển thị trạng thái thiếu nguồn và hạ mức tin cậy; không biến dữ liệu thiếu thành tín hiệu mua. Người dùng nên kiểm tra thời điểm cập nhật, nguồn sự kiện, thanh khoản, mức dừng lỗ và kịch bản bất lợi trước khi quyết định.

### Chỉ báo bổ trợ trong luồng Đề xuất

Ngoài Ichimoku, hệ thống sử dụng MACD 12/26/9 để kiểm tra động lượng và Bollinger Bands 20/2 để nhận biết giá đang ở nửa trên/nửa dưới hoặc vượt biên độ biến động. Các chỉ báo này là lớp xác nhận cho điểm xu hướng và không được dùng đơn độc: tín hiệu chỉ được ưu tiên khi phù hợp với SMA20/SMA50, dữ liệu đủ dài và các nguồn doanh nghiệp đã xác minh.
