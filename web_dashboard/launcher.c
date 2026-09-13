#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <stdio.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    const char* appUrl = "https://webdashboard-dun.vercel.app/#/ai-verification";
    char args[512];
    snprintf(args, sizeof(args), "--app=%s --window-size=1440,900", appUrl);

    // Try Edge first (preinstalled on all modern Windows 10/11 PCs)
    HINSTANCE res = ShellExecuteA(NULL, "open", "msedge.exe", args, NULL, SW_SHOWNORMAL);
    if ((INT_PTR)res > 32) {
        return 0;
    }

    // Try Chrome
    res = ShellExecuteA(NULL, "open", "chrome.exe", args, NULL, SW_SHOWNORMAL);
    if ((INT_PTR)res > 32) {
        return 0;
    }

    // Fallback: Default browser
    ShellExecuteA(NULL, "open", appUrl, NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
