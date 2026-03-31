async function testApi() {
  try {
    const baseUrl = 'http://localhost:5000/api';
    
    // Register test user
    const email = `test${Date.now()}@example.com`;
    console.log(`Registering user: ${email}`);
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email,
        password: 'password123'
      })
    });
    
    if (!regRes.ok) throw new Error(`Registration failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    const token = regData.accessToken;
    console.log('Registration successful, token received.');

    // Try creating a folder
    console.log('Attempting to create folder...');
    const folderRes = await fetch(`${baseUrl}/folders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'My New Folder',
        parentId: null
      })
    });
    
    if (!folderRes.ok) {
        console.error('Folder creation failed:', await folderRes.text());
    } else {
        console.log('Folder creation successful:', await folderRes.json());
    }
    
    // Try Init Upload
    console.log('Attempting to init file upload...');
    const initRes = await fetch(`${baseUrl}/files/init`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        folderId: null
      })
    });
    
    if (!initRes.ok) {
        console.error('Init file upload failed:', await initRes.text());
    } else {
        console.log('Init upload successful:', await initRes.json());
    }

  } catch (error) {
    console.error('Network/Other Error:', error.message);
  }
}

testApi();
