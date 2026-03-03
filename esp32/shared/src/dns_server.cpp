// Lightweight captive-portal DNS server.
// Responds to every DNS query with the AP gateway IP (192.168.4.1)
// so that phones/laptops auto-open the provisioning page.

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <lwip/sockets.h>
#include <lwip/netdb.h>
#include <esp_log.h>
#include <string.h>

#include "dns_server.h"

static const char* TAG = "DNSServer";
static TaskHandle_t s_dns_task = NULL;
static int s_sock = -1;

// DNS header (RFC 1035)
struct __attribute__((packed)) dns_header
{
    uint16_t id;
    uint16_t flags;
    uint16_t qdcount;
    uint16_t ancount;
    uint16_t nscount;
    uint16_t arcount;
};

// Fixed answer: type A, class IN, TTL 0, 4-byte IP
static const uint8_t DNS_ANS_SUFFIX[] = {
    0xC0, 0x0C,             // pointer to question name
    0x00, 0x01,             // type A
    0x00, 0x01,             // class IN
    0x00, 0x00, 0x00, 0x00, // TTL 0
    0x00, 0x04,             // data length 4
    192, 168, 4, 1          // IP address
};

static void dns_task(void* arg)
{
    s_sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s_sock < 0)
    {
        ESP_LOGE(TAG, "Failed to create socket");
        vTaskDelete(NULL);
        return;
    }

    struct sockaddr_in addr = {};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(53);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(s_sock, (struct sockaddr*)&addr, sizeof(addr)) < 0)
    {
        ESP_LOGE(TAG, "Failed to bind port 53");
        close(s_sock);
        s_sock = -1;
        vTaskDelete(NULL);
        return;
    }

    ESP_LOGI(TAG, "Captive portal DNS server started on :53");

    uint8_t buf[512];
    while (true)
    {
        struct sockaddr_in src = {};
        socklen_t src_len = sizeof(src);
        int len = recvfrom(s_sock, buf, sizeof(buf), 0, (struct sockaddr*)&src, &src_len);
        if (len < (int)sizeof(dns_header))
            continue;

        dns_header* hdr = (dns_header*)buf;

        // Build response: copy the query then append our answer
        hdr->flags = htons(0x8000 | 0x0400); // QR=1, AA=1
        hdr->ancount = hdr->qdcount;          // one answer per question
        hdr->nscount = 0;
        hdr->arcount = 0;

        // Append answer record after the query section
        if (len + (int)sizeof(DNS_ANS_SUFFIX) <= (int)sizeof(buf))
        {
            memcpy(buf + len, DNS_ANS_SUFFIX, sizeof(DNS_ANS_SUFFIX));
            sendto(s_sock, buf, len + sizeof(DNS_ANS_SUFFIX), 0, (struct sockaddr*)&src, src_len);
        }
    }
}

void dns_server_start()
{
    if (s_dns_task)
        return;
    xTaskCreate(dns_task, "dns_srv", 4096, NULL, 5, &s_dns_task);
}

void dns_server_stop()
{
    if (s_sock >= 0)
    {
        close(s_sock);
        s_sock = -1;
    }
    if (s_dns_task)
    {
        vTaskDelete(s_dns_task);
        s_dns_task = NULL;
    }
}
