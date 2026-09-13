#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <stdio.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    const char* appUrl = "https://webdashboard-dun.vercel.app/#/ai-verification";
    char args[512];
    snprintf(args, sizeof(args), "--app=%s --window-size=1440,900", appUrl);

    // List of known browser paths for native App Mode window on Windows
    const char* paths[] = {
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        NULL
    };

    for (int i = 0; paths[i] != NULL; i++) {
        DWORD attrib = GetFileAttributesA(paths[i]);
        if (attrib != INVALID_FILE_ATTRIBUTES && !(attrib & FILE_ATTRIBUTE_DIRECTORY)) {
            HINSTANCE res = ShellExecuteA(NULL, "open", paths[i], args, NULL, SW_SHOWNORMAL);
            if ((INT_PTR)res > 32) {
                return 0;
            }
        }
    }

    // Fallback: Default Browser
    ShellExecuteA(NULL, "open", appUrl, NULL, NULL, SW_SHOWNORMAL);
    return 0;
}
