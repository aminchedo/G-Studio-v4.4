/**
 * Quick interaction script - Run this to interact with the model immediately
 * This creates a simple HTML page that you can open in browser
 */

import { writeFile } from 'fs/promises';

const interactivePage = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تعامل فوری با مدل</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e1e2e 0%, #2d1b3d 100%);
            color: #e2e8f0;
            min-height: 100vh;
            padding: 20px;
            direction: rtl;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 {
            font-size: 2rem;
            background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .card {
            background: rgba(30, 41, 59, 0.9);
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 20px;
        }
        .button {
            background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin: 5px;
            transition: all 0.3s;
        }
        .button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
        }
        .button:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat { 
            min-height: 300px; 
            max-height: 500px; 
            overflow-y: auto; 
            padding: 15px; 
            background: rgba(15, 23, 42, 0.5); 
            border-radius: 10px; 
            margin-bottom: 15px; 
        }
        .message {
            margin-bottom: 15px;
            padding: 12px 15px;
            border-radius: 10px;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.user {
            background: rgba(139, 92, 246, 0.25);
            border-right: 4px solid #8b5cf6;
            margin-right: 20%;
        }
        .message.model {
            background: rgba(16, 185, 129, 0.25);
            border-right: 4px solid #10b981;
            margin-left: 20%;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .input-group textarea {
            flex: 1;
            background: rgba(15, 23, 42, 0.8);
            border: 2px solid rgba(148, 163, 184, 0.3);
            border-radius: 10px;
            padding: 15px;
            color: #e2e8f0;
            font-size: 1rem;
            min-height: 100px;
            font-family: inherit;
        }
        .input-group textarea:focus {
            outline: none;
            border-color: #8b5cf6;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.85rem;
            margin-bottom: 15px;
        }
        .status.ready { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status.loading { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .status.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 تعامل فوری با مدل Qwen</h1>
            <p style="color: #94a3b8; margin-top: 10px;">برنامه روی پورت 3000 در حال اجرا است</p>
        </div>

        <div class="card">
            <div>
                <span class="status" id="status">در حال بارگذاری...</span>
            </div>
            <div style="margin-top: 15px;">
                <button class="button" id="initBtn" onclick="init()">مقداردهی اولیه</button>
                <button class="button" id="loadBtn" onclick="load()" disabled>بارگذاری مدل</button>
            </div>
        </div>

        <div class="card">
            <h2 style="margin-bottom: 15px; color: #a78bfa;">چت با مدل</h2>
            <div class="chat" id="chat"></div>
            <div class="input-group">
                <textarea id="input" placeholder="پیام خود را وارد کنید..." disabled></textarea>
                <button class="button" id="sendBtn" onclick="send()" disabled>ارسال</button>
            </div>
        </div>
    </div>

    <script type="module">
        let service = null;

        function addMessage(role, text) {
            const chat = document.getElementById('chat');
            const msg = document.createElement('div');
            msg.className = \`message \${role}\`;
            msg.innerHTML = \`<strong>\${role === 'user' ? 'شما' : 'مدل'}:</strong> \${text.replace(/\\n/g, '<br>')}\`;
            chat.appendChild(msg);
            chat.scrollTop = chat.scrollHeight;
        }

        function updateStatus(status) {
            const el = document.getElementById('status');
            const statuses = {
                'NOT_INSTALLED': { text: 'نصب نشده', class: 'error' },
                'UNLOADED': { text: 'آماده (بارگذاری نشده)', class: 'ready' },
                'LOADING': { text: 'در حال بارگذاری...', class: 'loading' },
                'READY': { text: 'آماده ✅', class: 'ready' },
                'ERROR': { text: 'خطا ❌', class: 'error' }
            };
            const s = statuses[status] || { text: status, class: '' };
            el.textContent = s.text;
            el.className = \`status \${s.class}\`;
        }

        window.init = async () => {
            try {
                updateStatus('LOADING');
                const { LocalAIModelService } = await import('/services/localAIModelService.js');
                service = LocalAIModelService;
                await service.initialize();
                updateStatus(service.getStatus());
                addMessage('model', '✅ سرویس آماده است!');
                document.getElementById('loadBtn').disabled = service.getStatus() !== 'UNLOADED';
            } catch (e) {
                addMessage('model', \`❌ خطا: \${e.message}\`);
                updateStatus('ERROR');
            }
        };

        window.load = async () => {
            try {
                updateStatus('LOADING');
                await service.loadModel();
                updateStatus(service.getStatus());
                addMessage('model', '🎉 مدل آماده است! می‌توانید پیام بفرستید.');
                document.getElementById('input').disabled = false;
                document.getElementById('sendBtn').disabled = false;
            } catch (e) {
                addMessage('model', \`❌ خطا: \${e.message}\`);
                updateStatus('ERROR');
            }
        };

        window.send = async () => {
            const input = document.getElementById('input');
            const text = input.value.trim();
            if (!text) return;

            addMessage('user', text);
            input.value = '';
            input.disabled = true;
            document.getElementById('sendBtn').disabled = true;

            try {
                const result = await service.infer(text, { maxTokens: 512, temperature: 0.7 });
                addMessage('model', result.text);
            } catch (e) {
                addMessage('model', \`❌ خطا: \${e.message}\`);
            } finally {
                input.disabled = false;
                document.getElementById('sendBtn').disabled = false;
                input.focus();
            }
        };

        document.getElementById('input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        // Auto-init
        setTimeout(() => init(), 500);
    </script>
</body>
</html>`;

try {
    await writeFile('public/interact-now.html', interactivePage);
    console.log('\n✅ صفحه تعامل فوری ایجاد شد!\n');
    console.log('🌐 برای استفاده:');
    console.log('   http://localhost:3000/interact-now.html\n');
    console.log('📋 این صفحه به صورت خودکار:');
    console.log('   1. سرویس را مقداردهی اولیه می‌کند');
    console.log('   2. مدل را بارگذاری می‌کند');
    console.log('   3. آماده دریافت پیام است\n');
    console.log('💡 فقط صفحه را باز کنید و پیام بفرستید!\n');
} catch (error) {
    console.error('❌ خطا:', error.message);
    process.exit(1);
}
