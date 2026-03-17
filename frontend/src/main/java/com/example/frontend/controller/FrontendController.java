package com.example.frontend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpSession;

@Controller
public class FrontendController {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${backend.api.url}")
    private String backendUrl;

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("title", "Trang chủ - Web Tuyen Online");
        return "index";
    }

    @GetMapping("/login")
    public String loginForm(Model model, HttpSession session) {
        if (session.getAttribute("token") != null) {
            return "redirect:/dashboard";
        }
        model.addAttribute("title", "Đăng nhập");
        return "login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String username, @RequestParam String password, HttpSession session, Model model) {
        Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("password", password);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/auth/signin", body, Map.class);
            Map<?, ?> jwt = response.getBody();
            if (jwt != null) {
                session.setAttribute("token", jwt.get("token"));
                session.setAttribute("username", jwt.get("username"));
                session.setAttribute("email", jwt.get("email"));
                session.setAttribute("roles", (List<?>) jwt.get("roles"));
                return "redirect:/dashboard";
            }
        } catch (HttpClientErrorException e) {
            model.addAttribute("error", "Tên đăng nhập hoặc mật khẩu không đúng!");
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi kết nối đến máy chủ!");
        }
        return "login";
    }

    @GetMapping("/register")
    public String registerForm(Model model, HttpSession session) {
        if (session.getAttribute("token") != null) {
            return "redirect:/dashboard";
        }
        model.addAttribute("title", "Đăng ký");
        return "register";
    }

    @PostMapping("/register")
    public String register(@RequestParam String username, @RequestParam String email, 
                           @RequestParam String password, Model model) {
        Map<String, Object> body = new HashMap<>();
        body.put("username", username);
        body.put("email", email);
        body.put("password", password);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/auth/signup", body, Map.class);
            Map<?, ?> resp = response.getBody();
            if (resp != null) {
                model.addAttribute("message", String.valueOf(resp.get("message")));
                return "login";
            }
        } catch (HttpClientErrorException e) {
            model.addAttribute("error", "Lỗi đăng ký tài khoản!");
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi kết nối đến máy chủ!");
        }
        return "register";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordForm(Model model) {
        model.addAttribute("title", "Quên mật khẩu");
        return "forgot-password";
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String email, Model model) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/auth/forgot-password", body, Map.class);
            Map<?, ?> resp = response.getBody();
            if (resp != null) {
                model.addAttribute("message", String.valueOf(resp.get("message")));
            }
        } catch (HttpClientErrorException e) {
            model.addAttribute("error", "Email không tồn tại hoặc không hợp lệ!");
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi kết nối đến máy chủ!");
        }
        return "forgot-password";
    }

    @GetMapping("/reset-password")
    public String resetPasswordForm(@RequestParam String token, Model model) {
        model.addAttribute("token", token);
        model.addAttribute("title", "Đặt lại mật khẩu");
        return "reset-password";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String token, @RequestParam String newPassword, 
                                @RequestParam String confirmPassword, Model model) {
        if (!newPassword.equals(confirmPassword)) {
            model.addAttribute("error", "Mật khẩu xác nhận không khớp!");
            model.addAttribute("token", token);
            return "reset-password";
        }

        Map<String, Object> body = new HashMap<>();
        body.put("token", token);
        body.put("newPassword", newPassword);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/auth/reset-password", body, Map.class);
            Map<?, ?> resp = response.getBody();
            if (resp != null) {
                model.addAttribute("message", String.valueOf(resp.get("message")));
                return "login";
            }
        } catch (HttpClientErrorException e) {
            model.addAttribute("error", "Token không hợp lệ hoặc đã hết hạn!");
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi kết nối đến máy chủ!");
        }
        model.addAttribute("token", token);
        return "reset-password";
    }

    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {
        if (session.getAttribute("token") == null) {
            return "redirect:/login";
        }
        model.addAttribute("title", "Bảng điều khiển");
        return "dashboard";
    }

    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }

    @GetMapping("/truyen")
    public String comics(Model model) {
        List<Map<String, Object>> list = new java.util.ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            Map<String, Object> c = new java.util.HashMap<>();
            c.put("id", i);
            c.put("title", "Bộ truyện " + i);
            c.put("cover", "https://picsum.photos/seed/comic" + i + "/480/640");
            c.put("status", i % 2 == 0 ? "Đang cập nhật" : "Hoàn thành");
            c.put("latestChapter", 10 + i);
            c.put("views", 1000 * i);
            list.add(c);
        }
        model.addAttribute("comics", list);
        model.addAttribute("title", "Danh sách truyện");
        return "comics";
    }

    @GetMapping("/truyen/{id}")
    public String comicDetail(@org.springframework.web.bind.annotation.PathVariable Integer id, Model model) {
        Map<String, Object> comic = new java.util.HashMap<>();
        comic.put("id", id);
        comic.put("title", "Bộ truyện " + id);
        comic.put("cover", "https://picsum.photos/seed/comic" + id + "/480/640");
        comic.put("status", id % 2 == 0 ? "Đang cập nhật" : "Hoàn thành");
        comic.put("latestChapter", 20);
        comic.put("views", 12345);
        comic.put("genres", java.util.Arrays.asList("Hành động", "Phiêu lưu", "Học đường"));
        comic.put("description", "Một câu chuyện hấp dẫn với nhiều tình tiết bất ngờ.");

        List<Map<String, Object>> chapters = new java.util.ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            Map<String, Object> ch = new java.util.HashMap<>();
            ch.put("number", i);
            chapters.add(ch);
        }

        model.addAttribute("comic", comic);
        model.addAttribute("chapters", chapters);
        model.addAttribute("title", comic.get("title"));
        return "comic-detail";
    }

    @GetMapping("/doc/{id}/{chapter}")
    public String reader(@org.springframework.web.bind.annotation.PathVariable Integer id,
                         @org.springframework.web.bind.annotation.PathVariable Integer chapter,
                         Model model) {
        List<String> pages = new java.util.ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            pages.add("https://picsum.photos/seed/page" + id + "_" + chapter + "_" + i + "/1000/1400");
        }
        model.addAttribute("comicId", id);
        model.addAttribute("comicTitle", "Bộ truyện " + id);
        model.addAttribute("chapter", chapter);
        model.addAttribute("pages", pages);
        model.addAttribute("title", "Đọc truyện");
        return "reader";
    }

    @GetMapping("/email-test")
    public String emailTestForm(Model model, HttpSession session) {
        if (session.getAttribute("token") == null) {
            return "redirect:/login";
        }
        model.addAttribute("title", "Kiểm tra Email");
        return "email-test";
    }

    @PostMapping("/email/send-simple")
    public String sendSimpleEmail(@RequestParam String toEmail, @RequestParam String subject, 
                                 @RequestParam String content, Model model, HttpSession session) {
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("toEmail", toEmail);
        map.add("subject", subject);
        map.add("content", content);

        HttpHeaders headers = new HttpHeaders();
        Object token = session.getAttribute("token");
        if (token != null) {
            headers.set("Authorization", "Bearer " + token);
        }
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(map, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/email/send-simple", entity, Map.class);
            Map<?, ?> resp = response.getBody();
            if (resp != null) {
                model.addAttribute("message", String.valueOf(resp.get("message")));
            }
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi gửi email: " + e.getMessage());
        }
        return "email-test";
    }

    @PostMapping("/email/send-notification")
    public String sendNotificationEmail(@RequestParam String toEmail, @RequestParam String title, 
                                       @RequestParam String message, Model model, HttpSession session) {
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("toEmail", toEmail);
        map.add("title", title);
        map.add("message", message);

        HttpHeaders headers = new HttpHeaders();
        Object token = session.getAttribute("token");
        if (token != null) {
            headers.set("Authorization", "Bearer " + token);
        }
        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(map, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(backendUrl + "/email/send-notification", entity, Map.class);
            Map<?, ?> resp = response.getBody();
            if (resp != null) {
                model.addAttribute("message", String.valueOf(resp.get("message")));
            }
        } catch (Exception e) {
            model.addAttribute("error", "Lỗi gửi thông báo: " + e.getMessage());
        }
        return "email-test";
    }
}
